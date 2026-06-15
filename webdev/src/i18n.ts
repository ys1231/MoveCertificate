/**
 * MoveCertificate — 国际化（i18n）模块
 * 
 * 支持三种语言（对应项目 README 的语言）：
 *   zh-CN — 中文（简体）
 *   en    — English
 *   tr    — Türkçe
 * 
 * 用法：
 *   import { t, setLang, getLang, supportedLangs } from './i18n.js';
 *   t('certsTab')  →  根据当前语言返回对应文字
 *   setLang('en')  →  切换语言
 */

// ==================== 类型定义 ====================

/** 支持的语言代码 */
export type LangCode = 'zh-CN' | 'en' | 'tr';

/** 翻译字典中每个 key 对应的三种语言值 */
type TranslationEntry = Record<LangCode, string>;

/** 支持的语言列表项 */
export interface LangItem {
    code: LangCode;
    name: string;
    nativeName: string;
}

// ==================== 翻译表 ====================
// 每个 key 对应三个语言的翻译值
// 如果你要加新文字，在这里添加一个 key，然后给三种语言分别填上翻译即可

const translations: Record<string, TranslationEntry> = {
    // 页面标题
    appTitle: {
        'zh-CN': 'MoveCertificate',
        en: 'MoveCertificate',
        tr: 'MoveCertificate',
    },

    // ==================== 底部标签 ====================
    certsTab: {
        'zh-CN': '证书管理',
        en: 'Certificates',
        tr: 'Sertifikalar',
    },
    modeTab: {
        'zh-CN': '模式配置',
        en: 'Mode Config',
        tr: 'Mod Ayarı',
    },
    logTab: {
        'zh-CN': '运行日志',
        en: 'Runtime Log',
        tr: 'Çalışma Günlüğü',
    },
    setTab: {
        'zh-CN': '设置',
        en: 'Settings',
        tr: 'Ayarlar',
    },

    // ==================== 证书管理页 ====================
    moduleInfo: {
        'zh-CN': '模块信息',
        en: 'Module Info',
        tr: 'Modül Bilgisi',
    },
    certList: {
        'zh-CN': '证书列表',
        en: 'Certificate List',
        tr: 'Sertifika Listesi',
    },
    loading: {
        'zh-CN': '正在加载…',
        en: 'Loading…',
        tr: 'Yükleniyor…',
    },
    refreshCerts: {
        'zh-CN': '🔄 刷新证书列表',
        en: '🔄 Refresh Certificates',
        tr: '🔄 Sertifikaları Yenile',
    },
    delete: {
        'zh-CN': '删除',
        en: 'Delete',
        tr: 'Sil',
    },

    // ==================== 模式配置页 ====================
    currentMode: {
        'zh-CN': '当前模式',
        en: 'Current Mode',
        tr: 'Geçerli Mod',
    },
    modeDesc: {
        'zh-CN': '当前正在使用此模式挂载证书',
        en: 'Currently using this mode to mount certificates',
        tr: 'Sertifikalar bu mod kullanılarak bağlanıyor',
    },
    switchTo: {
        'zh-CN': '切换到 ',
        en: 'Switch to ',
        tr: 'Şuna geç: ',
    },
    modeHint: {
        'zh-CN': '切换后需要重启设备才能生效',
        en: 'Reboot required for changes to take effect',
        tr: 'Değişikliklerin etkili olması için yeniden başlatma gerekli',
    },
    modeExplain: {
        'zh-CN': '模式说明',
        en: 'Mode Explanation',
        tr: 'Mod Açıklaması',
    },
    compatibleMode: {
        'zh-CN': '兼容模式',
        en: 'Compatible Mode',
        tr: 'Uyumlu Mod',
    },
    builtinMode: {
        'zh-CN': '内置模式',
        en: 'Built-in Mode',
        tr: 'Yerleşik Mod',
    },
    compatibleTitle: {
        'zh-CN': '🔧 兼容模式（compatible）',
        en: '🔧 Compatible Mode',
        tr: '🔧 Uyumlu Mod (compatible)',
    },
    compatibleDesc: {
        'zh-CN': '使用 tmpfs 内存文件系统直接挂载证书目录。不依赖 Magisk 的 Magic Mount 机制，兼容性最好。',
        en: 'Uses tmpfs memory filesystem to directly mount certificate directories. Does not rely on Magisk Magic Mount mechanism, best compatibility.',
        tr: 'Sertifika dizinlerini doğrudan bağlamak için tmpfs bellek dosya sistemi kullanır. Magisk Magic Mount mekanizmasına bağlı değildir, en iyi uyumluluk.',
    },
    compatibleSuitable: {
        'zh-CN': '适用于：',
        en: 'Suitable for: ',
        tr: 'Uygun olduğu: ',
    },
    compatibleSuitableVal: {
        'zh-CN': 'KernelSU、APatch、Magisk 等主流 Root 方案。',
        en: 'KernelSU, APatch, Magisk and other major root solutions.',
        tr: 'KernelSU, APatch, Magisk ve diğer ana root çözümleri.',
    },
    compatibleFeature: {
        'zh-CN': '特点：',
        en: 'Feature: ',
        tr: 'Özellik: ',
    },
    compatibleFeatureVal: {
        'zh-CN': '稳定可靠，是模块的默认模式。',
        en: 'Stable and reliable, the default mode of the module.',
        tr: 'Kararlı ve güvenilir, modülün varsayılan modu.',
    },
    builtinTitle: {
        'zh-CN': '📦 内置模式（builtin）',
        en: '📦 Built-in Mode',
        tr: '📦 Yerleşik Mod (builtin)',
    },
    builtinDesc: {
        'zh-CN': '利用 Magisk 模块自身的目录结构实现挂载。依赖 Magisk 框架的 Magic Mount 功能，不需要手动执行 mount 命令。',
        en: 'Uses Magisk module directory structure for mounting. Relies on Magisk Magic Mount, no manual mount commands needed.',
        tr: 'Bağlama için Magisk modül dizin yapısını kullanır. Magisk Magic Mount özelliğine dayanır, manuel mount komutları gerekmez.',
    },
    builtinSuitableVal: {
        'zh-CN': 'KernelSU、APatch、Magisk 等主流 Root 方案。',
        en: 'KernelSU, APatch, Magisk and other major root solutions.',
        tr: 'KernelSU, APatch, Magisk ve diğer ana root çözümleri.',
    },
    builtinFeatureVal: {
        'zh-CN': 'Android14及以上受限于 Magic Mount 元模块挂载方案。需要搭配「Magic Mount Metamodule」+ 扩展分区 apex 可兼容,其它自行测试。',
        en: 'Limited to Magic Mount meta module mounting scheme. Known to work with "Magic Mount Metamodule" + extended partition apex.',
        tr: 'Magic Mount meta modül bağlama şemasıyla sınırlıdır. "Magic Mount Metamodule" + genişletilmiş bölüm apex ile uyumlu olduğu bilinmektedir.',
    },

    // ==================== 运行日志页 ====================
    runtimeLog: {
        'zh-CN': '运行日志',
        en: 'Runtime Log',
        tr: 'Çalışma Günlüğü',
    },
    logPlaceholder: {
        'zh-CN': '点击下方刷新按钮加载日志…',
        en: 'Click refresh button below to load log…',
        tr: 'Günlüğü yüklemek için aşağıdaki yenile düğmesine tıklayın…',
    },
    refreshLog: {
        'zh-CN': '🔄 刷新日志',
        en: '🔄 Refresh Log',
        tr: '🔄 Günlüğü Yenile',
    },
    noLog: {
        'zh-CN': '暂无日志',
        en: 'No logs available',
        tr: 'Günlük mevcut değil',
    },

    // ==================== 模态框（删除确认） ====================
    modalTitle: {
        'zh-CN': '此操作不可逆',
        en: 'This action is irreversible',
        tr: 'Bu işlem geri alınamaz',
    },
    confirmDeleteMsg: {
        'zh-CN': '确认要删除这个证书吗？',
        en: 'Are you sure you want to delete this certificate?',
        tr: 'Bu sertifikayı silmek istediğinizden emin misiniz?',
    },
    confirmDeleteCert: {
        'zh-CN': '确认要删除 {0} 证书吗？',
        en: 'Delete certificate {0}?',
        tr: '{0} sertifikası silinsin mi?',
    },
    cancel: {
        'zh-CN': '取消',
        en: 'Cancel',
        tr: 'İptal',
    },
    confirm: {
        'zh-CN': '确认',
        en: 'Confirm',
        tr: 'Onayla',
    },

    // ==================== Toast 消息 ====================
    loadingApp: {
        'zh-CN': 'Loading MoveCertificate!',
        en: 'Loading MoveCertificate!',
        tr: 'MoveCertificate Yükleniyor!',
    },
    deletedReboot: {
        'zh-CN': '{0} 已删除，重启生效！',
        en: '{0} deleted, reboot to take effect!',
        tr: '{0} silindi, etkili olması için yeniden başlatın!',
    },
    deleteFailed: {
        'zh-CN': '删除失败，请重试',
        en: 'Delete failed, please try again',
        tr: 'Silme başarısız, lütfen tekrar deneyin',
    },
    loadFailedRoot: {
        'zh-CN': '加载失败，请检查 root 权限',
        en: 'Load failed, check root permission',
        tr: 'Yükleme başarısız, root iznini kontrol edin',
    },
    noCertFound: {
        'zh-CN': '未检测到已安装的证书',
        en: 'No installed certificates detected',
        tr: 'Yüklü sertifika bulunamadı',
    },
    modeSwitched: {
        'zh-CN': '已切换为 {0}，重启后生效',
        en: 'Switched to {0}, reboot to take effect',
        tr: '{0} moduna geçildi, yeniden başlatın',
    },
    modeSwitchFailed: {
        'zh-CN': '切换失败，请检查 root 权限',
        en: 'Switch failed, check root permission',
        tr: 'Geçiş başarısız, root iznini kontrol edin',
    },
    getVersionFailed: {
        'zh-CN': '获取系统版本失败，请检查 root 权限',
        en: 'Failed to get system version, check root permission',
        tr: 'Sistem sürümü alınamadı, root iznini kontrol edin',
    },
    getCertListFailed: {
        'zh-CN': '获取证书列表失败，请检查 root 权限',
        en: 'Failed to get certificate list, check root permission',
        tr: 'Sertifika listesi alınamadı, root iznini kontrol edin',
    },
    getVersionInfoFailed: {
        'zh-CN': '加载版本信息失败',
        en: 'Failed to load version info',
        tr: 'Sürüm bilgisi yüklenemedi',
    },
    getLogFailed: {
        'zh-CN': '加载日志失败',
        en: 'Failed to load log',
        tr: 'Günlük yüklenemedi',
    },
    
    // ==================== 设置页 ====================
    languageSettings: {
        'zh-CN': '语言设置',
        en: 'Language',
        tr: 'Dil',
    },
    themeSettings: {
        'zh-CN': '主题设置',
        en: 'Theme',
        tr: 'Tema',
    },
    themeDark: {
        'zh-CN': '深色',
        en: 'Dark',
        tr: 'Koyu',
    },
    themeLight: {
        'zh-CN': '浅色',
        en: 'Light',
        tr: 'Açık',
    },
    themeAuto: {
        'zh-CN': '跟随系统',
        en: 'Auto',
        tr: 'Otomatik',
    },
    aboutSection: {
        'zh-CN': '关于',
        en: 'About',
        tr: 'Hakkında',
    },
    contributorsTitle: {
        'zh-CN': '贡献者',
        en: 'Contributors',
        tr: 'Katkıda Bulunanlar',
    },
} as const;

/** 所有翻译 key 的联合类型 */
export type I18nKey = keyof typeof translations;

// ==================== 语言列表 ====================

/** 支持的语言列表 */
export const supportedLangs: readonly LangItem[] = [
    { code: 'zh-CN', name: '中文', nativeName: '中文' },
    { code: 'en',    name: 'English', nativeName: 'English' },
    { code: 'tr',    name: 'Türkçe', nativeName: 'Türkçe' },
] as const;

// ==================== 语言检测与存储 ====================

/** localStorage 存储键 */
const STORAGE_KEY = 'movecert_lang';

/** 获取当前语言 */
export function getLang(): LangCode {
    // 优先读取用户手动选择
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && supportedLangs.some(l => l.code === saved)) {
        return saved as LangCode;
    }

    // 自动检测系统语言
    const navLang = navigator.language || '';
    if (navLang.startsWith('zh')) return 'zh-CN';
    if (navLang.startsWith('tr')) return 'tr';
    return 'en';
}

/** 设置语言并保存到 localStorage */
export function setLang(code: LangCode): void {
    localStorage.setItem(STORAGE_KEY, code);
}

// ==================== 翻译函数 ====================

/** 当前语言 */
let currentLang: LangCode = getLang();

/**
 * 获取翻译文字
 * 
 * @param key - 翻译 key
 * @param args - 可选的替换参数，对应文字中的 {0} {1} 等占位符
 * @returns 翻译后的文字
 * 
 * 用法：
 *   t('delete')                    → '删除'
 *   t('deletedReboot', 'abc.0')   → 'abc.0 已删除，重启生效！'
 */
export function t(key: string, ...args: string[]): string {
    const dict = translations[key as I18nKey];
    if (!dict) {
        console.warn(`i18n: 缺少翻译 key "${key}"`);
        return key;
    }

    let text: string = dict[currentLang] || dict['en'] || key;

    // 替换占位符 {0} {1} ...
    args.forEach((arg, i) => {
        text = text.replace(`{${i}}`, arg);
    });

    return text;
}

/**
 * 刷新当前语言（在 setLang 后调用，重新读取）
 */
export function refreshLang(): void {
    currentLang = getLang();
}
