/**
 * MoveCertificate — 常量定义
 * 这里存放项目中所有不会改变的固定值，方便统一管理
 * 如果你需要修改某个路径或配置，只需要改这一个文件
 */

// ==================== 证书存储路径 ====================
// Android 不同版本的证书存放位置不同，这里全部列出来

/** Android 14 以下版本的系统证书目录 */
export const CERT_LOW_SYSTEM = '/system/etc/security/cacerts/';
/** Android 14 及以上版本的系统证书目录（APEX 模块方式） */
export const CERT_HIGH_SYSTEM = '/apex/com.android.conscrypt/cacerts/';
/** 用户手动安装的证书存放目录 */
export const CERT_USER_SYSTEM = '/data/misc/user/0/cacerts-added/';
/** 自定义证书目录（用户可以把证书文件放到这里，模块会自动导入） */
export const CERT_CUSTOM = '/data/local/tmp/cert/';
/** 模块自身的证书备份目录 */
export const CERT_MODULE = '/data/adb/modules/MoveCertificate/certificates';
/** 模块内置挂载点：低版本系统证书目录（Magisk Magic Mount 用） */
export const CERT_MODULE_SYSTEM = '/data/adb/modules/MoveCertificate/system/etc/security/cacerts';
/** 模块内置挂载点：高版本系统证书目录（Magisk Magic Mount 用） */
export const CERT_MODULE_APEX = '/data/adb/modules/MoveCertificate/apex/com.android.conscrypt/cacerts';

// ==================== 模块文件路径 ====================

/** 模块属性文件，包含版本号、作者等信息 */
export const MODULE_PROP_PATH = '/data/adb/modules/MoveCertificate/module.prop';
/** 模块安装日志文件，记录每次启动时的运行情况 */
export const INSTALL_LOG_PATH = '/data/adb/modules/MoveCertificate/install.log';
/** 模式配置文件，控制使用「兼容模式」还是「内置方法」 */
export const MODE_CONF_PATH = '/data/adb/modules/MoveCertificate/mode.conf';

// ==================== 证书名称字典 ====================
/** 常见抓包工具 CA 证书的文件名前缀 → 显示名称 */
export const CERT_NAME_DICT: Readonly<Record<string, string>> = {
    '9a5ba575': 'PortSwigger CA',      // Burp Suite
    '84040dbc': 'Charles Proxy CA',    // Charles
    '0725b47c': 'Fiddler Root CA',     // Fiddler
    '7f4536e6': 'Reqable CA',          // Reqable
    'c8750f0d': 'Mitmproxy CA',        // Mitmproxy
    '0f4ed297': 'AdGuard Personal CA', // AdGuard
    '364618e0': 'Reqable Proxy CA',    // Reqable 代理
    '87bc3517': 'HttpCanary CA',       // HttpCanary（小黄鸟）
    '243f0bfb': 'ProxyPin CA',         // ProxyPin
};

// ==================== 远程 API ====================
/** 当本地字典匹配不到证书名称时，把证书 base64 内容发到这个接口查询 */
export const CERT_QUERY_API = 'https://cert.ys1231.cn/query';

// ==================== 证书删除路径汇总 ====================
/** 删除证书时需要从所有可能的位置清理，保证删干净 */
export const ALL_CERT_PATHS: readonly string[] = [
    CERT_HIGH_SYSTEM,
    CERT_LOW_SYSTEM,
    CERT_CUSTOM,
    CERT_MODULE,
    CERT_USER_SYSTEM,
    CERT_MODULE_SYSTEM,
    CERT_MODULE_APEX,
];

// ==================== 类型导出 ====================

/** 运行模式 */
export type RunMode = 'compatible' | 'builtin';

/** 证书状态 */
export type CertStatus = 'success' | 'failed';

/** 证书条目 */
export interface CertEntry {
    status: CertStatus;
    name: string;
}
