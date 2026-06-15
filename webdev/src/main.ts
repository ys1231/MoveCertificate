/**
 * MoveCertificate — 主入口文件
 * 负责整个页面的初始化、Tab 切换、事件协调，以及语言切换
 * 
 * 页面有三个 Tab（底部标签栏）：
 *   1. 证书管理 — 显示模块信息和证书列表（默认显示）
 *   2. 模式配置 — 查看和切换运行模式
 *   3. 运行日志 — 查看模块运行日志（点击时才加载，省资源）
 */

import { fullScreen, toast } from 'kernelsu';
import { t, getLang, setLang, refreshLang } from './i18n.js';
import type { LangCode } from './i18n.js';
import {
    getVersionInfo,
    getLoggerInfo,
    getInstallCertResults,
    deleteCert,
    getCurrentMode,
    setMode,
} from './cert-service.js';
import {
    renderVersionInfo,
    renderLogInfo,
    renderCertList,
    renderModeConfig,
    showSkeleton,
    hideSkeleton,
} from './ui-renderer.js';
import type { SwitchModeHandler } from './ui-renderer.js';
import { createModal } from './modal.js';

// ==================== Tab 名称类型 ====================

type TabName = 'certs' | 'mode' | 'log' | 'settings';

// ==================== i18n：翻译页面上的静态文字 ====================

/**
 * 把页面上所有带 data-i18n 属性的元素的文字替换为当前语言的翻译
 * 
 * 原理：遍历所有 [data-i18n="key"] 元素，用 t(key) 的值替换其 textContent
 * 这包括标题、标签栏按钮、模态框文字、分组框标题等
 */
function applyI18n(): void {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
            el.textContent = t(key);
        }
    });

    // 更新自定义语言选择器的显示文字和激活选项
    const langText = document.getElementById('langSelectedText');
    if (langText) {
        langText.textContent = LANG_LABELS[getLang()];
    }
    document.querySelectorAll<HTMLElement>('.custom-select-option').forEach(opt => {
        const lang = opt.getAttribute('data-lang') as LangCode;
        opt.classList.toggle('active', lang === getLang());
    });
}

// ==================== 语言切换 ====================

/** 语言代码对应的显示名称 */
const LANG_LABELS: Record<LangCode, string> = {
    'zh-CN': '中文',
    en: 'English',
    tr: 'Türkçe',
};

/**
 * 切换语言
 * 保存选择到 localStorage，刷新翻译，重新渲染当前页面
 */
function switchLanguage(code: LangCode): void {
    setLang(code);
    refreshLang(); // 更新 i18n 模块内部的 currentLang
    applyI18n();   // 刷新页面上的静态文字

    // 重新渲染模式配置页（因为它的内容是通过 JS 动态生成的）
    const modeTab = document.getElementById('tab-mode');
    if (modeTab && modeTab.classList.contains('active')) {
        loadModeTab();
    }

    // 更新按钮文字
    updateButtonTexts();
}

// ==================== 主题切换 ====================

/** localStorage 存储键 */
const THEME_STORAGE_KEY = 'movecert_theme';

/** 支持的主题 */
type Theme = 'dark' | 'light' | 'auto';

/**
 * 获取当前主题设置
 */
function getTheme(): Theme {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light' || saved === 'auto') {
        return saved;
    }
    return 'auto';
}

/**
 * 应用主题到 <html> 的 data-theme 属性
 */
function applyTheme(theme: Theme): void {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // 更新设置页的主题按钮激活状态
    document.querySelectorAll<HTMLElement>('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
    });
}

/**
 * 初始化主题（页面加载时调用）
 */
function initTheme(): void {
    const theme = getTheme();
    applyTheme(theme);
}

/**
 * 更新按钮文字（这些按钮没有 data-i18n，需要手动更新）
 */
function updateButtonTexts(): void {
    const refreshCertsBtn = document.getElementById('refreshCertsBtn');
    if (refreshCertsBtn) {
        refreshCertsBtn.textContent = t('refreshCerts');
    }
    const refreshLogBtn = document.getElementById('refreshLogBtn');
    if (refreshLogBtn) {
        refreshLogBtn.textContent = t('refreshLog');
    }
}

// ==================== Tab 切换逻辑 ====================

/**
 * 切换当前显示的 Tab 页面
 * 同时更新底部标签栏滑动指示器的位置
 */
function switchTab(tabName: TabName): void {
    // 1. 隐藏所有 Tab 页面
    document.querySelectorAll<HTMLElement>('.tab-page').forEach(page => {
        page.classList.remove('active');
    });

    // 2. 显示目标 Tab 页面（触发 CSS 进入动画）
    const targetPage = document.getElementById('tab-' + tabName);
    if (targetPage) {
        // 强制回流后添加 active 类以触发动画
        void targetPage.offsetWidth;
        targetPage.classList.add('active');
    }

    // 3. 更新底部标签栏高亮 + 更新滑动指示器位置
    document.querySelectorAll<HTMLElement>('.tab-item').forEach((item, index) => {
        item.classList.toggle('active', item.getAttribute('data-tab') === tabName);
    });

    // 更新 CSS 变量驱动滑动指示器
    const tabBar = document.querySelector<HTMLElement>('.tab-bar');
    if (tabBar) {
        // 用 getBoundingClientRect 计算指示器的精确位置
        const activeTab = tabBar.querySelector<HTMLElement>('.tab-item.active');
        if (activeTab) {
            const tabRect = activeTab.getBoundingClientRect();
            const barRect = tabBar.getBoundingClientRect();
            // 指示器宽度 24px，居中对齐按钮中心
            const indicatorLeft = (tabRect.left - barRect.left) + tabRect.width / 2 - 12;
            tabBar.style.setProperty('--indicator-left', indicatorLeft + 'px');
        }
    }
}

// ==================== 各 Tab 的数据加载 ====================

/** 日志是否已经加载过（懒加载标志位） */
let logLoaded = false;
/** 当前选中的模式 */
let currentMode = 'compatible' as import('./constants.js').RunMode;

/**
 * 加载证书管理页的数据
 * 包括模块版本信息和证书列表
 */
async function loadCertsTab(): Promise<void> {
    showSkeleton('versionInfo', 1);
    showSkeleton('certificateList', 4);

    try {
        // 并行请求版本信息和证书列表，加快加载速度
        const [versionResult, certResult] = await Promise.allSettled([
            getVersionInfo(),
            getInstallCertResults(),
        ]);

        // 渲染版本信息
        hideSkeleton('versionInfo');
        if (versionResult.status === 'fulfilled') {
            renderVersionInfo('versionInfo', versionResult.value);
        } else {
            renderVersionInfo('versionInfo', [t('getVersionInfoFailed')]);
        }

        // 渲染证书列表
        hideSkeleton('certificateList');
        if (certResult.status === 'fulfilled' && certResult.value.length > 0) {
            // 创建删除确认模态框
            const modal = createModal('deleteModal');

            // 用户确认删除后的操作
            modal.onConfirm(async (fileName: string) => {
                try {
                    await deleteCert(fileName);
                    toast(t('deletedReboot', fileName));
                    // 删除后重新加载证书列表
                    const updatedCerts = await getInstallCertResults();
                    renderCertList('certificateList', updatedCerts, handleDelete);
                } catch (e) {
                    console.error('删除证书失败:', e);
                    toast(t('deleteFailed'));
                }
            });

            // 点击删除按钮时弹出确认框
            function handleDelete(fileName: string, liElement: HTMLLIElement): void {
                modal.show(fileName);
            }

            renderCertList('certificateList', certResult.value, handleDelete);
        }
    } catch (e) {
        console.error('加载证书管理页失败:', e);
        hideSkeleton('versionInfo');
        hideSkeleton('certificateList');
        toast(t('loadFailedRoot'));
    }
}

/**
 * 加载模式配置页的数据
 */
async function loadModeTab(): Promise<void> {
    showSkeleton('modeConfig', 2);

    // 切换模式的处理函数（声明提前，避免 TDZ 问题）
    const switchModeHandler: SwitchModeHandler = (newMode) => {
        setMode(newMode).then(() => {
            currentMode = newMode;
            const modeLabel = t(newMode === 'compatible' ? 'compatibleMode' : 'builtinMode');
            toast(t('modeSwitched', modeLabel));
            renderModeConfig('modeConfig', currentMode, switchModeHandler);
        }).catch(() => {
            toast(t('modeSwitchFailed'));
        });
    };

    try {
        currentMode = await getCurrentMode();
        hideSkeleton('modeConfig');

        // 渲染模式配置页面，传入切换回调
        renderModeConfig('modeConfig', currentMode, switchModeHandler);
    } catch (e) {
        console.error('加载模式配置失败:', e);
        hideSkeleton('modeConfig');
        toast(t('loadFailedRoot'));
    }
}

/**
 * 加载运行日志页的数据（懒加载）
 * 只有用户第一次切换到日志 Tab 时才真正读取日志文件
 */
async function loadLogTab(): Promise<void> {
    // 如果已经加载过，直接返回
    if (logLoaded) return;

    showSkeleton('logContent', 5);

    try {
        const logs = await getLoggerInfo();
        hideSkeleton('logContent');
        renderLogInfo('logContent', logs);
        logLoaded = true;
    } catch (e) {
        console.error('加载日志失败:', e);
        hideSkeleton('logContent');
        renderLogInfo('logContent', [t('getLogFailed')]);
    }
}

/**
 * 刷新运行日志
 */
async function refreshLogTab(): Promise<void> {
    showSkeleton('logContent', 5);
    try {
        const logs = await getLoggerInfo();
        hideSkeleton('logContent');
        renderLogInfo('logContent', logs);
    } catch (e) {
        console.error('刷新日志失败:', e);
        hideSkeleton('logContent');
        renderLogInfo('logContent', [t('getLogFailed')]);
    }
}

/**
 * 初始化自定义语言下拉组件
 */
function initLangDropdown(): void {
    const wrap = document.getElementById('langSelectWrap');
    const btn = document.getElementById('langSelectBtn');
    if (!wrap || !btn) return;

    const groupbox = wrap.closest<HTMLElement>('.groupbox');

    // 关闭下拉（同时移除 groupbox 层级提升）
    function closeDropdown(): void {
        if (!wrap) return;
        wrap.classList.remove('open');
        if (groupbox) {
            groupbox.classList.remove('dropdown-open');
        }
    }

    // 点击按钮：打开/关闭下拉
    btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const isOpen = wrap.classList.toggle('open');
        if (groupbox) {
            groupbox.classList.toggle('dropdown-open', isOpen);
        }
    });

    // 点击选项：切换语言
    wrap.querySelectorAll<HTMLElement>('.custom-select-option').forEach(opt => {
        opt.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            const lang = opt.getAttribute('data-lang') as LangCode;
            if (lang) {
                switchLanguage(lang);
            }
            closeDropdown();
        });
    });

    // 点击外部关闭下拉
    document.addEventListener('click', () => {
        closeDropdown();
    });
}

/**
 * 页面加载完成后自动执行
 * 这是整个应用的入口点
 */
window.onload = async (): Promise<void> => {
    // 显示加载提示
    toast(t('loadingApp'));
    fullScreen(false);

    // 初始化 i18n：翻译页面静态文字 + 同步语言选择器
    applyI18n();
    updateButtonTexts();

    // 初始化主题
    initTheme();

    // 初始化自定义语言下拉组件
    initLangDropdown();

    // 绑定主题切换按钮事件
    document.querySelectorAll<HTMLElement>('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme') as Theme;
            if (theme) {
                applyTheme(theme);
            }
        });
    });

    // ==================== 绑定底部标签栏点击事件 ====================
    document.querySelectorAll<HTMLElement>('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab') as TabName;
            switchTab(tabName);

            // 根据切换到的 Tab 加载对应数据
            switch (tabName) {
                case 'certs':
                    loadCertsTab();
                    break;
                case 'mode':
                    loadModeTab();
                    break;
                case 'log':
                    loadLogTab(); // 懒加载
                    break;
                case 'settings':
                    // 设置页是纯静态的，不需要加载数据
                    break;
            }
        });
    });

    // ==================== 绑定刷新按钮 ====================
    const refreshCertsBtn = document.getElementById('refreshCertsBtn');
    if (refreshCertsBtn) {
        refreshCertsBtn.addEventListener('click', loadCertsTab);
    }

    const refreshLogBtn = document.getElementById('refreshLogBtn');
    if (refreshLogBtn) {
        refreshLogBtn.addEventListener('click', refreshLogTab);
    }

    // ==================== 默认加载证书管理页 ====================
    switchTab('certs');
    loadCertsTab();
};
