/**
 * MoveCertificate — 页面渲染层
 * 这个文件负责所有"往页面上画东西"的工作
 * 比如显示版本信息、渲染证书列表、显示模式配置等
 * 
 * 注意：这个文件不直接调用 Android shell 命令，只操作 DOM 元素
 */

import { t } from './i18n.js';
import type { RunMode, CertEntry } from './constants.js';

// ==================== 类型定义 ====================

/** 删除按钮回调 */
export type DeleteHandler = (fileName: string, liElement: HTMLLIElement) => void;

/** 模式切换回调 */
export type SwitchModeHandler = (newMode: RunMode) => void;

// ==================== 信息渲染 ====================

/**
 * 在页面上显示模块版本信息
 * 把 module.prop 的内容逐行显示在指定区域
 */
export function renderVersionInfo(containerId: string, lines: string[]): void {
    const el = document.getElementById(containerId);
    if (!el) return;

    // 用 <br> 把每行文字拼起来，实现换行显示
    el.innerHTML = lines.join('<br>');
}

/**
 * 在页面上显示运行日志
 * 把 install.log 的内容逐行显示在指定区域
 */
export function renderLogInfo(containerId: string, lines: string[]): void {
    const el = document.getElementById(containerId);
    if (!el) return;

    // 用 <br> 把每行拼起来，实现换行显示
    el.innerHTML = lines.join('<br>');
}

// ==================== 证书列表 ====================

/**
 * 渲染证书列表
 * 把证书数据变成页面上的列表项，每个证书包含：
 *   - 状态圆点（绿色 = 迁移成功，灰色 = 未成功）
 *   - 证书哈希值和名称
 *   - 删除按钮
 */
export function renderCertList(
    containerId: string,
    certs: CertEntry[],
    onDelete: DeleteHandler,
): void {
    const list = document.getElementById(containerId);
    if (!list) return;

    // 先清空旧内容，防止重复渲染
    list.innerHTML = '';

    if (!certs || !Array.isArray(certs) || certs.length === 0) {
        return;
    }

    // 遍历每个证书，创建对应的列表项
    for (const cert of certs) {
        // 创建一个 <li> 元素代表一行
        const li = document.createElement('li');

        // 左侧的状态圆点：绿色表示已迁移到系统证书目录，灰色表示未成功
        const statusDot = document.createElement('div');
        statusDot.className = `status-dot ${cert.status === 'success' ? 'green' : 'gray'}`;
        li.appendChild(statusDot);

        // 中间的证书名称文字
        const certName = document.createElement('span');
        certName.textContent = cert.name;
        li.appendChild(certName);

        // 右侧的删除按钮
        const deleteButton = document.createElement('button');
        deleteButton.textContent = t('delete');
        deleteButton.className = 'delete-button';
        // cert.name 格式是 "hash: 名称"，用 : 分割取第一部分就是文件名
        deleteButton.onclick = () => onDelete(cert.name.split(':')[0]!, li);
        li.appendChild(deleteButton);

        list.appendChild(li);
    }
}

// ==================== 骨架屏 ====================

/**
 * 显示骨架屏（加载占位动画）
 * 数据还没加载完时显示灰色条纹动画，告诉用户"正在加载中"
 */
export function showSkeleton(containerId: string, lineCount: number = 3): void {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = '';
    for (let i = 0; i < lineCount; i++) {
        const line = document.createElement('div');
        // 最后一行短一点，看起来更自然
        line.className = 'skeleton skeleton-line' + (i === lineCount - 1 ? ' short' : '');
        el.appendChild(line);
    }
}

/**
 * 隐藏骨架屏
 * 数据加载完成后调用，清空骨架屏内容
 */
export function hideSkeleton(containerId: string): void {
    const el = document.getElementById(containerId);
    if (el) {
        el.innerHTML = '';
    }
}

// ==================== 模式配置 ====================

/**
 * 渲染模式配置页面
 * 显示当前运行模式，提供切换按钮，并附上两种模式的说明
 */
export function renderModeConfig(
    containerId: string,
    currentMode: RunMode,
    onSwitch: SwitchModeHandler,
): void {
    const el = document.getElementById(containerId);
    if (!el) return;

    // 两种模式的名称（从 i18n 获取）
    const modeNames: Record<RunMode, string> = {
        compatible: t('compatibleMode'),
        builtin: t('builtinMode'),
    };

    // 构建整个模式配置页面的 HTML
    el.innerHTML = `
        <!-- 当前模式状态卡片 -->
        <div class="groupbox">
            <span class="groupbox-title">${t('currentMode')}</span>
            <div class="mode-status">
                <span class="mode-badge ${currentMode}">${modeNames[currentMode]}</span>
                <span class="mode-desc">${t('modeDesc')}</span>
            </div>
            <button class="mode-switch-btn" id="switchModeBtn">
                ${t('switchTo')}${currentMode === 'compatible' ? t('builtinMode') : t('compatibleMode')}
            </button>
            <p class="mode-hint">${t('modeHint')}</p>
        </div>

        <!-- 两种模式的详细说明 -->
        <div class="groupbox">
            <span class="groupbox-title">${t('modeExplain')}</span>
            <div class="mode-explain">
                <div class="mode-explain-item">
                    <h4>${t('compatibleTitle')}</h4>
                    <p>
                        ${t('compatibleDesc')}<br>
                        <strong>${t('compatibleSuitable')}</strong>${t('compatibleSuitableVal')}<br>
                        <strong>${t('compatibleFeature')}</strong>${t('compatibleFeatureVal')}
                    </p>
                </div>
                <div class="mode-explain-item">
                    <h4>${t('builtinTitle')}</h4>
                    <p>
                        ${t('builtinDesc')}<br>
                        <strong>${t('compatibleSuitable')}</strong>${t('builtinSuitableVal')}<br>
                        <strong>${t('compatibleFeature')}</strong>${t('builtinFeatureVal')}
                    </p>
                </div>
            </div>
        </div>
    `;

    // 绑定切换按钮的点击事件
    const switchBtn = document.getElementById('switchModeBtn');
    if (switchBtn) {
        switchBtn.onclick = () => {
            // 计算切换后的新模式
            const newMode: RunMode = currentMode === 'compatible' ? 'builtin' : 'compatible';
            onSwitch(newMode);
        };
    }
}
