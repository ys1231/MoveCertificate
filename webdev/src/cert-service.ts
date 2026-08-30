/**
 * MoveCertificate — 数据服务层
 * 这个文件负责所有"获取数据"和"操作数据"的工作
 * 比如读证书列表、删证书、查日志、读写模式配置等
 * 
 * 约定：
 *   1. 这个文件不操作页面 DOM，也不显示任何提示（toast），只处理数据
 *   2. 操作失败时抛出异常（带中文错误信息），由调用方决定如何提示用户
 *   3. "没有数据"与"操作失败"是两回事：前者返回空结果，后者抛异常
 */

import { exec } from 'kernelsu';
import {
    CERT_HIGH_SYSTEM,
    CERT_LOW_SYSTEM,
    CERT_USER_SYSTEM,
    CERT_MODULE,
    ALL_CERT_PATHS,
    MODULE_PROP_PATH,
    INSTALL_LOG_PATH,
    MODE_CONF_PATH,
    CERT_NAME_DICT,
    CERT_QUERY_API,
    CERT_MODULE_APEX_NUM_GLOB,
    SYSTEM_CERTS_LIST_PATH,
} from './constants.js';
import type { RunMode, CertEntry } from './constants.js';

// ==================== 类型定义 ====================

/** exec 命令的返回结果 */
interface ExecResult {
    errno: number;
    stdout: string;
    stderr: string;
}

/** 远程证书识别 API 的响应 */
interface CertQueryResponse {
    result?: string;
    error?: string;
}

// ==================== 基础文件操作 ====================

/**
 * 列出指定目录下的所有文件名
 * 相当于在终端执行 ls /some/path
 * 
 * @throws 命令执行失败（目录不存在、权限不足等）时抛出异常
 */
export async function getFileList(path: string): Promise<string[]> {
    const { errno, stdout } = await exec(`ls '${path}'`) as ExecResult;
    if (errno !== 0) {
        throw new Error(`列出目录失败: ${path}`);
    }
    // 按换行拆分输出，过滤掉空行
    return String(stdout).trim().split('\n').filter(Boolean);
}

/**
 * 读取文件内容并转为 base64 编码
 * 证书文件是二进制格式，用 base64 方便传输和比较
 * 
 * @throws 命令执行失败时抛出异常
 */
export async function readFileBase64(path: string): Promise<string> {
    const { errno, stdout } = await exec(`cat '${path}' | base64`) as ExecResult;
    if (errno !== 0) {
        throw new Error(`读取文件失败: ${path}`);
    }
    return String(stdout).trim();
}

// ==================== 证书识别 ====================

/**
 * 向远程服务器查询证书名称（尽力而为，失败返回 null，不中断主流程）
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
 * 采用两级查找策略，按优先级依次尝试：
 *   第一级：根据证书文件名中的 hash 值查本地字典（最快）
 *   第二级：读取证书内容，交给远程 API 查询
 * 识别失败返回 'Unknown'，不影响证书列表展示
 */
export async function getCertName(path: string): Promise<string> {
    // 第一级：用文件名 hash 匹配本地字典
    for (const [key, value] of Object.entries(CERT_NAME_DICT)) {
        if (containsSubstring(path, key)) {
            return value;
        }
    }

    try {
        // 第二级：读取证书内容，交给远程 API 查询
        const certText = await readFileBase64(path);
        const result = await requestCertName(certText);
        if (result) {
            return result;
        }
    } catch (err) {
        console.error('识别证书名称失败:', err);
    }

    return 'Unknown';
}

// ==================== 证书管理 ====================

/**
 * 删除指定证书文件
 * 因为证书可能被复制到了多个目录，所以需要同时从所有位置删除
 * 
 * 安全与可靠性：
 *   1. 删除前校验文件名格式（只允许 "hash.序号"），防止 shell 命令注入
 *   2. 删除后校验核心目录中文件是否真的消失，未消失则抛出异常
 * 
 * @throws 文件名不合法或删除未生效时抛出异常
 */
export async function deleteCert(file: string): Promise<void> {
    // 证书文件名必须是 "hash.序号" 格式（如 02e06844.0），其他格式一律拒绝
    if (!/^[0-9a-fA-F]{8}\.[0-9]+$/.test(file)) {
        throw new Error(`非法的证书文件名: ${file}`);
    }

    // 并行删除所有位置的文件（个别目录不存在不影响整体流程）
    const rmCommands = ALL_CERT_PATHS.map(p =>
        exec(`rm -f '${p}${file}'`).catch(() => {})
    );
    // 带版本号的 apex 目录路径含动态版本号，不能用单引号固定路径，改用 glob 展开清理
    // file 已经过上面的格式校验，不含 shell 特殊字符，可直接拼接
    rmCommands.push(exec(`rm -f ${CERT_MODULE_APEX_NUM_GLOB}${file}`).catch(() => {}));
    await Promise.allSettled(rmCommands);

    // 删除后校验：用户证书目录和模块备份目录是核心存储，不应再存在该文件
    const [userFiles, moduleFiles] = await Promise.all([
        getFileList(CERT_USER_SYSTEM),
        getFileList(CERT_MODULE),
    ]);
    if (userFiles.includes(file) || moduleFiles.includes(file)) {
        throw new Error(`证书删除失败: ${file}`);
    }
}

/**
 * 获取模块版本信息
 * 读取 module.prop 文件，里面记录了版本号、作者、描述等
 * 
 * @throws 读取失败时抛出异常
 */
export async function getVersionInfo(): Promise<string[]> {
    const { errno, stdout } = await exec(`cat '${MODULE_PROP_PATH}'`) as ExecResult;
    if (errno !== 0) {
        throw new Error(`读取模块信息失败: ${MODULE_PROP_PATH}`);
    }
    return String(stdout).trim().split('\n');
}

/**
 * 获取模块运行日志
 * 读取 install.log 文件，记录模块每次启动的执行情况
 * 文件不存在时（模块安装后、首次重启前）返回空数组，由调用方展示"暂无日志"
 * 
 * @throws 读取失败时抛出异常
 */
export async function getLoggerInfo(): Promise<string[]> {
    const { errno, stdout } = await exec(`cat '${INSTALL_LOG_PATH}'`) as ExecResult;
    if (errno !== 0) {
        return []; // 日志文件不存在属于正常情况（首次安装未重启），当作"空"处理
    }
    return String(stdout).trim().split('\n').filter(Boolean);
}

/**
 * 获取已安装证书的完整列表（含名称和状态）
 * 这是证书管理页面的核心数据源
 * 
 * 流程：
 *   1. 获取 Android 系统版本（决定去哪个目录查系统证书）
 *   2. 并行列出用户证书目录和系统证书目录
 *   3. 并发识别每个用户证书的名称，并判断是否已成功安装到系统目录
 * 
 * @returns 证书条目数组；没有任何证书时返回空数组（读取失败会抛异常，两者区分开）
 */
export async function getInstallCertResults(): Promise<CertEntry[]> {
    const { errno, stdout } = await exec('getprop ro.build.version.sdk') as ExecResult;
    if (errno !== 0) {
        throw new Error('获取系统版本失败');
    }
    const sdkVersion = Number(stdout);
    if (isNaN(sdkVersion)) {
        throw new Error('获取系统版本失败');
    }

    const systemCertPath = sdkVersion >= 34 ? CERT_HIGH_SYSTEM : CERT_LOW_SYSTEM;
    const [userCerts, systemCerts, moduleCerts] = await Promise.all([
        getFileList(CERT_USER_SYSTEM).catch(() => [] as string[]),
        getFileList(systemCertPath).catch(() => [] as string[]),
        getFileList(CERT_MODULE).catch(() => [] as string[]),
    ]);

    let baseSystemCerts: string[] = [];
    try {
        const { errno: errnoList, stdout: listOut } = await exec(`cat '${SYSTEM_CERTS_LIST_PATH}'`) as ExecResult;
        if (errnoList === 0) {
            baseSystemCerts = String(listOut).trim().split('\n').filter(Boolean);
        }
    } catch (e) {
    }

    const userInstalledCerts = new Set<string>();

    for (const c of userCerts) {
        userInstalledCerts.add(c);
    }

    for (const c of moduleCerts) {
        if (baseSystemCerts.length > 0 && !baseSystemCerts.includes(c)) {
            userInstalledCerts.add(c);
        }
    }

    const allUserCerts = Array.from(userInstalledCerts);

    if (allUserCerts.length === 0 && systemCerts.length === 0) {
        return [];
    }

    return Promise.all<CertEntry>(allUserCerts.map(async (item) => {
        const targetPath = moduleCerts.includes(item) ? CERT_MODULE : CERT_USER_SYSTEM;
        const name = await getCertName(targetPath + item);
        return {
            status: systemCerts.includes(item) ? 'success' : 'failed',
            name: `${item}: ${name}`,
        };
    }));
}

// ==================== 模式配置 ====================

/**
 * 获取当前运行模式
 * 读取 mode.conf 文件，解析出 compatible（兼容模式）或 builtin（内置方法）
 * 文件不存在或内容无效时返回默认值 compatible（这是"默认配置"语义，不算错误）
 */
export async function getCurrentMode(): Promise<RunMode> {
    const { errno, stdout } = await exec(`cat '${MODE_CONF_PATH}'`) as ExecResult;
    if (errno !== 0) {
        return 'compatible';
    }

    const content = String(stdout).trim().toLowerCase();
    // 从 "mode=compatible" 或 "mode=builtin" 中提取值
    return content.includes('builtin') ? 'builtin' : 'compatible';
}

/**
 * 切换运行模式
 * 把新的模式值写入 mode.conf 文件
 * 注意：修改后需要重启设备才能生效
 * 
 * @throws 写入失败时抛出异常
 */
export async function setMode(mode: RunMode): Promise<void> {
    await exec(`echo "mode=${mode}" > '${MODE_CONF_PATH}'`);
}
