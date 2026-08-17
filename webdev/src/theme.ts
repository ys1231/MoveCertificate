/**
 * MoveCertificate — 主题管理模块
 * 负责主题的读取、应用与切换事件绑定
 * 
 * 支持三种主题：深色 / 浅色 / 跟随系统
 * 主题选择保存在 localStorage，页面刷新后保持
 */

// ==================== 常量与类型 ====================

/** localStorage 存储键 */
const THEME_STORAGE_KEY = 'movecert_theme';

/** 支持的主题 */
export type Theme = 'dark' | 'light' | 'auto';

// ==================== 主题读写 ====================

/** 读取当前主题设置（无效值时回退为跟随系统） */
export function getTheme(): Theme {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'auto') {
        return saved;
    }
    return 'auto';
}

/** 应用主题：写入 <html> 的 data-theme 属性并保存选择 */
function applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/** 让设置页的主题按钮高亮状态与当前主题一致 */
function syncThemeButtons(): void {
    const theme = getTheme();
    document.querySelectorAll<HTMLElement>('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
    });
}

// ==================== 初始化与事件绑定 ====================

/**
 * 初始化主题（页面加载时调用一次）
 * 应用已保存的主题，并同步设置页按钮的激活状态
 */
export function initTheme(): void {
    applyTheme(getTheme());
    syncThemeButtons();
}

/**
 * 绑定设置页主题按钮的点击事件（页面加载时调用一次）
 */
export function bindThemeButtons(): void {
    document.querySelectorAll<HTMLElement>('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme') as Theme;
            if (theme) {
                applyTheme(theme);
                syncThemeButtons();
            }
        });
    });
}
