/**
 * MoveCertificate — 主入口文件
 * 负责整个页面的初始化、Tab 切换、事件协调，以及语言切换
 * 
 * 页面有四个 Tab（底部标签栏）：
 *   1. 证书管理 — 显示模块信息和证书列表（默认显示）
 *   2. 模式配置 — 查看和切换运行模式
 *   3. 运行日志 — 查看模块运行日志
 *   4. 设置 — 语言与主题（纯静态页面）
 * 
 * 数据加载策略（避免不必要的重复请求）：
 *   - 版本信息：静态数据，只加载一次
 *   - 证书列表：切换 Tab 不重复加载；点击"刷新证书列表"按钮才重新拉取
 *   - 模式配置：切换 Tab 不重复读取，只在首次进入时从文件读取
 *   - 运行日志：切换 Tab 不重复加载；点击"刷新日志"按钮才重新拉取
 */

import { fullScreen, toast } from 'kernelsu';
import { t, getLang, setLang, LANG_LABELS } from './i18n.js';
import type { LangCode, I18nKey } from './i18n.js';
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
import type { SwitchModeHandler, DeleteHandler } from './ui-renderer.js';
import { createModal } from './modal.js';
import type { ModalController } from './modal.js';
import { initTheme, bindThemeButtons } from './theme.js';
import type { RunMode } from './constants.js';

// ==================== Tab 名称类型 ====================

type TabName = 'certs' | 'mode' | 'log' | 'settings';

// ==================== 页面状态 ====================

/** 证书列表是否已加载过（切换 Tab 不重复加载，点刷新按钮才强制更新） */
let certsLoaded = false;
/** 版本信息是否已加载过（静态数据，只加载一次） */
let versionLoaded = false;
/** 模式配置是否已加载过（切换 Tab 不重复读取） */
let modeLoaded = false;
/** 日志是否已加载过（懒加载标志位） */
let logLoaded = false;
/** 当前生效的运行模式（与 mode.conf 保持一致） */
let currentMode: RunMode = 'compatible';
/** 删除确认弹窗（页面初始化时创建一次，不随列表刷新重复创建） */
let deleteModal: ModalController | null = null;

// ==================== i18n：翻译页面上的静态文字 ====================

/**
 * 把页面上所有带 data-i18n 属性的元素的文字替换为当前语言的翻译
 * 这包括标题、标签栏按钮、模态框文字、分组框标题等
 */
function applyI18n(): void {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
            // data-i18n 的值来自 HTML 模板，类型上做一次断言
            el.textContent = t(key as I18nKey);
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

/**
 * 切换语言
 * setLang 内部会同步翻译状态，这里只需刷新页面上的静态文字
 */
function switchLanguage(code: LangCode): void {
    setLang(code);
    applyI18n();

    // 模式配置页的内容由 JS 动态生成，切换语言后需要重新渲染
    const modeTab = document.getElementById('tab-mode');
    if (modeTab && modeTab.classList.contains('active')) {
        renderModeConfig('modeConfig', currentMode, switchModeHandler);
    }

    // 更新按钮文字（这些按钮没有 data-i18n，需要手动更新）
    updateButtonTexts();
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
    document.querySelectorAll<HTMLElement>('.tab-item').forEach((item) => {
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

/**
 * 加载模块版本信息（静态数据，只加载一次）
 */
async function loadVersionInfo(): Promise<void> {
    if (versionLoaded) {
        return;
    }

    showSkeleton('versionInfo', 1);
    try {
        const lines = await getVersionInfo();
        // 先移除骨架屏再渲染：hideSkeleton 会清空容器，顺序不能反
        hideSkeleton('versionInfo');
        renderVersionInfo('versionInfo', lines);
        versionLoaded = true;
    } catch (e) {
        console.error('加载版本信息失败:', e);
        hideSkeleton('versionInfo');
        renderVersionInfo('versionInfo', [t('getVersionInfoFailed')]);
    }
}

/**
 * 加载证书列表
 * @param force 为 true 时强制重新拉取（刷新按钮使用）；
 *              否则已有数据时直接跳过（切换 Tab 使用，不重复请求）
 */
async function loadCertList(force = false): Promise<void> {
    if (!force && certsLoaded) {
        return; // 已有数据，切换 Tab 时直接展示，不重复请求
    }

    showSkeleton('certificateList', 4);
    try {
        const certs = await getInstallCertResults();
        certsLoaded = true;
        // 先移除骨架屏再渲染：hideSkeleton 会清空容器，顺序不能反
        hideSkeleton('certificateList');
        if (certs.length === 0) {
            toast(t('noCertFound'));
        }
        renderCertList('certificateList', certs, handleDelete);
    } catch (e) {
        console.error('加载证书列表失败:', e);
        // 失败时重置标记：删除后刷新失败会导致列表与实际状态不一致，切换 Tab 时自动重试
        certsLoaded = false;
        hideSkeleton('certificateList');
        // 保留页面已有内容，不破坏已显示的数据
        toast(t('getCertListFailed'));
    }
}

/**
 * 加载证书管理页的数据（版本信息 + 证书列表）
 * 两者互不依赖，并行加载
 */
async function loadCertsTab(): Promise<void> {
    await Promise.all([loadVersionInfo(), loadCertList()]);
}

/**
 * 加载模式配置页的数据
 * 只在首次进入时从文件读取，切换 Tab 不重复读取
 */
async function loadModeTab(): Promise<void> {
    if (modeLoaded) {
        return;
    }

    showSkeleton('modeConfig', 2);
    try {
        currentMode = await getCurrentMode();
        modeLoaded = true;
    } catch (e) {
        console.error('加载模式配置失败:', e);
        toast(t('loadFailedRoot'));
    } finally {
        hideSkeleton('modeConfig');
        // 无论读取成功与否都渲染页面（失败时展示默认的兼容模式）
        renderModeConfig('modeConfig', currentMode, switchModeHandler);
    }
}

/**
 * 加载运行日志页的数据
 * 只在首次进入时读取，切换 Tab 不重复加载
 */
async function loadLogTab(): Promise<void> {
    if (logLoaded) {
        return;
    }

    showSkeleton('logContent', 5);
    try {
        const logs = await getLoggerInfo();
        // 先移除骨架屏再渲染：hideSkeleton 会清空容器，顺序不能反
        hideSkeleton('logContent');
        renderLogInfo('logContent', logs.length > 0 ? logs : [t('noLog')]);
        logLoaded = true;
    } catch (e) {
        console.error('加载日志失败:', e);
        hideSkeleton('logContent');
        renderLogInfo('logContent', [t('getLogFailed')]);
    }
}

/**
 * 刷新运行日志（点击"刷新日志"按钮时调用）
 */
async function refreshLogTab(): Promise<void> {
    showSkeleton('logContent', 5);
    try {
        const logs = await getLoggerInfo();
        // 先移除骨架屏再渲染：hideSkeleton 会清空容器，顺序不能反
        hideSkeleton('logContent');
        renderLogInfo('logContent', logs.length > 0 ? logs : [t('noLog')]);
        logLoaded = true; // 刷新成功后视为已加载，切换 Tab 不再自动重试
    } catch (e) {
        console.error('刷新日志失败:', e);
        hideSkeleton('logContent');
        renderLogInfo('logContent', [t('getLogFailed')]);
    }
}

// ==================== 模式切换 ====================

/**
 * 切换运行模式
 * 成功后在本地更新状态并重新渲染；失败只提示，不改变页面状态
 */
const switchModeHandler: SwitchModeHandler = (newMode) => {
    setMode(newMode).then(() => {
        currentMode = newMode;
        toast(t('modeSwitched', t(newMode === 'compatible' ? 'compatibleMode' : 'builtinMode')));
        renderModeConfig('modeConfig', currentMode, switchModeHandler);
    }).catch((e) => {
        console.error('切换模式失败:', e);
        toast(t('modeSwitchFailed'));
    });
};

// ==================== 删除证书 ====================

/**
 * 点击证书列表中的删除按钮：弹出确认框
 */
const handleDelete: DeleteHandler = (fileName) => {
    deleteModal?.show(fileName);
};

/**
 * 用户在确认框中点击"确认"后执行删除
 * 删除成功后强制重新拉取证书列表（这是用户显式操作后的必要更新）
 */
async function confirmDeleteCert(fileName: string): Promise<void> {
    try {
        await deleteCert(fileName);
        toast(t('deletedReboot', fileName));
        await loadCertList(true);
    } catch (e) {
        console.error('删除证书失败:', e);
        toast(t('deleteFailed'));
    }
}

// ==================== 自定义语言下拉组件 ====================

/**
 * 初始化自定义语言下拉组件
 */
function initLangDropdown(): void {
    const wrap = document.getElementById('langSelectWrap');
    const btn = document.getElementById('langSelectBtn');
    if (!wrap || !btn) return;

    // 保存非空引用：闭包内的变量 TS 无法保持类型窄化，用别名避免到处判空
    const wrapBox = wrap;

    const groupbox = wrap.closest<HTMLElement>('.groupbox');

    // 关闭下拉（同时移除 groupbox 层级提升）
    function closeDropdown(): void {
        wrapBox.classList.remove('open');
        if (groupbox) {
            groupbox.classList.remove('dropdown-open');
        }
    }

    // 点击按钮：打开/关闭下拉
    btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const isOpen = wrapBox.classList.toggle('open');
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

// ==================== 页面初始化 ====================

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
    bindThemeButtons();

    // 初始化自定义语言下拉组件
    initLangDropdown();

    // 删除确认弹窗只创建一次，确认回调固定指向"删除并刷新列表"
    deleteModal = createModal('deleteModal');
    deleteModal.onConfirm(confirmDeleteCert);

    // ==================== 绑定底部标签栏点击事件 ====================
    document.querySelectorAll<HTMLElement>('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab') as TabName;
            switchTab(tabName);

            // 根据切换到的 Tab 加载对应数据
            // 各加载函数内部有"已加载则跳过"的判断，切换 Tab 不会重复请求
            switch (tabName) {
                case 'certs':
                    loadCertsTab();
                    break;
                case 'mode':
                    loadModeTab();
                    break;
                case 'log':
                    loadLogTab();
                    break;
                case 'settings':
                    // 设置页是纯静态的，不需要加载数据
                    break;
            }
        });
    });

    // ==================== 绑定刷新按钮 ====================
    // 只有用户主动点击刷新按钮时才重新拉取数据
    const refreshCertsBtn = document.getElementById('refreshCertsBtn');
    if (refreshCertsBtn) {
        refreshCertsBtn.addEventListener('click', () => loadCertList(true));
    }

    const refreshLogBtn = document.getElementById('refreshLogBtn');
    if (refreshLogBtn) {
        refreshLogBtn.addEventListener('click', refreshLogTab);
    }

    // ==================== 默认加载证书管理页 ====================
    switchTab('certs');
    loadCertsTab();
};
