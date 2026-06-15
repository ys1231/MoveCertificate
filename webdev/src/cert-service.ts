/**
 * MoveCertificate — 数据服务层
 * 这个文件负责所有"获取数据"和"操作数据"的工作
 * 比如读证书列表、删证书、查日志、读写模式配置等
 * 
 * 注意：这个文件不操作页面 DOM，只处理数据
 */

import { exec, toast } from 'kernelsu';
import { t } from './i18n.js';
import {
    CERT_HIGH_SYSTEM,
    CERT_LOW_SYSTEM,
    CERT_USER_SYSTEM,
    ALL_CERT_PATHS,
    MODULE_PROP_PATH,
    INSTALL_LOG_PATH,
    MODE_CONF_PATH,
    CERT_NAME_DICT,
    CERT_QUERY_API,
} from './constants.js';
import type { RunMode, CertEntry } from './constants.js';

// ==================== 类型定义 ====================

/** exec 命令的返回结果 */
interface ExecResult {
    errno: number;
    stdout: string;
    stderr: string;
}

/** API 查询响应 */
interface CertQueryResponse {
    result?: string;
    error?: string;
}

// ==================== 文件操作 ====================

/**
 * 列出指定目录下的所有文件名
 * 相当于在终端执行 ls /some/path 命令
 */
export async function getFileList(path: string): Promise<string[]> {
    try {
        // 调用 Android shell 执行 ls 命令
        const { errno, stdout } = await exec(`ls '${path}'`) as ExecResult;
        if (errno === 0) {
            // 把输出按换行拆分，过滤掉空行
            return String(stdout).trim().split('\n').filter(Boolean);
        }
        return [];
    } catch (e) {
        console.error('列出文件失败:', e);
        return [];
    }
}

/**
 * 读取文件内容并转为 base64 编码
 * 证书文件是二进制格式，用 base64 方便传输和比较
 */
export async function readFileBase64(path: string): Promise<string> {
    try {
        const { errno, stdout } = await exec(`cat '${path}' | base64`) as ExecResult;
        if (errno === 0) {
            return String(stdout).trim();
        }
        return '';
    } catch (e) {
        console.error('读取文件失败:', e);
        return '';
    }
}

// ==================== 证书识别 ====================

/**
 * 向远程服务器查询证书名称
 * 当本地字典匹配不到时，把证书内容发给服务器识别
 * 设置 5 秒超时，避免网络不好时卡太久
 */
async function requestCertName(base64Data: string): Promise<string | null> {
    try {
        // AbortController 用于实现超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(CERT_QUERY_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'cert base64', data: base64Data }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error('服务器响应异常');
        }

        const responseData: CertQueryResponse = await response.json();
        if (responseData.error) {
            console.error('服务器返回错误:', responseData.error);
            return null;
        }

        return responseData.result ?? null;
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            console.error('查询证书名称超时（超过5秒）');
        } else {
            console.error('查询证书名称失败:', err);
        }
        return null;
    }
}

/**
 * 判断字符串是否包含另一个字符串（忽略大小写）
 * 比如 "MyCert" 和 "mycert" 会判定为匹配
 */
function containsSubstring(str: string, substring: string): boolean {
    return str.toLowerCase().includes(substring.toLowerCase());
}

/**
 * 识别证书名称
 * 采用三级查找策略，按优先级依次尝试：
 * 
 * 第一级：根据证书文件名中的 hash 值查本地字典（最快）
 * 第二级：读取证书文件的 base64 内容，用内容匹配本地字典
 * 第三级：把 base64 内容发给远程 API 查询
 */
export async function getCertName(path: string): Promise<string> {
    try {
        // 第一级：用文件名 hash 匹配
        for (const [key, value] of Object.entries(CERT_NAME_DICT)) {
            if (containsSubstring(path, key)) {
                return value;
            }
        }

        // 第二级：读取证书文件的 base64 内容，发给远程 API 查询
        const certText = await readFileBase64(path);

        // 第三级：远程 API 查询
        const result = await requestCertName(certText);
        if (result !== null && result !== '' && result !== undefined) {
            return result;
        }

        return 'Unknown';
    } catch (err) {
        console.error('识别证书名称失败:', err);
        return 'Unknown';
    }
}

// ==================== 证书管理 ====================

/**
 * 删除指定证书文件
 * 因为证书可能被复制到了多个目录，所以要同时从所有位置删除
 * 所有删除命令并行执行，节省时间
 */
export async function deleteCert(file: string): Promise<void> {
    const rmCommands = ALL_CERT_PATHS.map(p =>
        exec(`rm -f '${p}${file}'`).catch(() => {})
    );

    // 并行执行，不等待逐个完成
    await Promise.allSettled(rmCommands);
}

/**
 * 获取模块版本信息
 * 读取 module.prop 文件，里面记录了版本号、作者、描述等
 */
export async function getVersionInfo(): Promise<string[]> {
    try {
        const { errno, stdout } = await exec(`cat '${MODULE_PROP_PATH}'`) as ExecResult;
        if (errno === 0) {
            return String(stdout).trim().split('\n');
        }
        return [t('getVersionInfoFailed')];
    } catch (e) {
        console.error('获取版本信息失败:', e);
        return [t('getVersionInfoFailed')];
    }
}

/**
 * 获取模块运行日志
 * 读取 install.log 文件，记录模块每次启动的执行情况
 * 注意：这个函数只在用户切换到「运行日志」tab 时才会被调用（懒加载）
 */
export async function getLoggerInfo(): Promise<string[]> {
    try {
        const { errno, stdout } = await exec(`cat '${INSTALL_LOG_PATH}'`) as ExecResult;
        if (errno === 0) {
            return String(stdout).trim().split('\n');
        }
        return [t('noLog')];
    } catch (e) {
        console.error('获取日志失败:', e);
        return [t('getLogFailed')];
    }
}

/**
 * 获取已安装证书的完整列表（含名称和状态）
 * 这是证书管理页面的核心数据源
 * 
 * 流程：
 *   1. 获取 Android 系统版本（决定去哪个目录查系统证书）
 *   2. 列出用户证书目录下的所有文件
 *   3. 列出系统证书目录下的所有文件
 *   4. 逐个识别证书名称，并判断是否已成功安装到系统目录
 */
export async function getInstallCertResults(): Promise<CertEntry[]> {
    try {
        // 1. 获取当前 Android 系统版本号
        const { errno, stdout } = await exec('getprop ro.build.version.release') as ExecResult;
        const systemVersion = Number(stdout);
        if (isNaN(systemVersion)) {
            toast(t('getVersionFailed'));
            return [];
        }

        // 2. 列出用户安装的证书（/data/misc/user/0/cacerts-added/）
        const userCerts = await getFileList(CERT_USER_SYSTEM);

        // 3. 列出系统证书目录
        const systemCertPath = systemVersion >= 14 ? CERT_HIGH_SYSTEM : CERT_LOW_SYSTEM;
        const systemCerts = await getFileList(systemCertPath);

        if (!userCerts.length && !systemCerts.length) {
            toast(t('noCertFound'));
            return [];
        }

        // 4. 逐个识别证书名称并判断状态
        const results: CertEntry[] = [];
        for (const item of userCerts) {
            const name = await getCertName(CERT_USER_SYSTEM + item);
            const status = systemCerts.includes(item) ? 'success' : 'failed';
            results.push({ status, name: `${item}: ${name}` });
        }

        return results;
    } catch (e) {
        console.error('获取证书列表失败:', e);
        toast(t('getCertListFailed'));
        return [];
    }
}

// ==================== 模式配置 ====================

/**
 * 获取当前运行模式
 * 读取 mode.conf 文件，解析出 compatible（兼容模式）或 builtin（内置方法）
 * 如果文件不存在或内容无效，默认返回 compatible
 */
export async function getCurrentMode(): Promise<RunMode> {
    try {
        const { errno, stdout } = await exec(`cat '${MODE_CONF_PATH}'`) as ExecResult;
        if (errno !== 0) {
            return 'compatible'; // 文件不存在，使用默认值
        }

        const content = String(stdout).trim().toLowerCase();
        // 从 "mode=compatible" 或 "mode=builtin" 中提取值
        if (content.includes('builtin')) {
            return 'builtin';
        }
        return 'compatible'; // 其他情况都当作兼容模式
    } catch (e) {
        console.error('读取模式配置失败:', e);
        return 'compatible';
    }
}

/**
 * 切换运行模式
 * 把新的模式值写入 mode.conf 文件
 * 注意：修改后需要重启设备才能生效
 */
export async function setMode(mode: RunMode): Promise<void> {
    try {
        await exec(`echo "mode=${mode}" > '${MODE_CONF_PATH}'`);
    } catch (e) {
        console.error('写入模式配置失败:', e);
        throw e;
    }
}
