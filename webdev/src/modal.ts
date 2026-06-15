/**
 * MoveCertificate — 模态框控制器
 * 管理删除确认弹窗的显示、隐藏和确认操作
 * 
 * 什么是模态框？就是那个从页面中间弹出的确认窗口，
 * 用户点了删除按钮后会弹出来问"确认要删除吗？"
 */

import { t } from './i18n.js';

// ==================== 类型定义 ====================

/** 确认删除的回调函数类型 */
export type ConfirmCallback = (fileName: string) => void;

/** 模态框控制器接口 */
export interface ModalController {
    /** 显示模态框 */
    show: (fileName: string) => void;
    /** 隐藏模态框 */
    hide: () => void;
    /** 注册确认后的回调函数 */
    onConfirm: (callback: ConfirmCallback) => void;
}

// ==================== 工厂函数 ====================

/** 已绑定过 window click 事件的模态框 ID 集合，防止重复绑定 */
const boundModalIds = new Set<string>();

/**
 * 创建一个模态框控制器
 * 返回一个对象，包含 show、hide、onConfirm 三个方法
 * 
 * 用法示例：
 *   const modal = createModal('deleteModal');
 *   modal.onConfirm((fileName) => { 执行删除操作 });
 *   modal.show('证书文件名');
 */
export function createModal(modalId: string): ModalController {
    // 找到页面上的模态框元素
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error('找不到模态框元素:', modalId);
        // 返回空函数，避免后续调用报错
        return {
            show: () => {},
            hide: () => {},
            onConfirm: () => {},
        };
    }

    // TypeScript 窄化：此时 modal 一定非 null
    const modalEl = modal;

    const confirmMessage = document.getElementById('confirmMessage');
    const confirmDeleteButton = document.getElementById('confirmDelete');
    const cancelDeleteButton = document.getElementById('cancelDelete');

    // 内部状态：当前要删除的文件名和确认后的回调函数
    let currentFileName: string | null = null;
    let confirmCallback: ConfirmCallback | null = null;

    /**
     * 显示模态框
     */
    function show(fileName: string): void {
        currentFileName = fileName;
        modalEl.style.display = 'block';
        if (confirmMessage) {
            confirmMessage.textContent = t('confirmDeleteCert', fileName);
        }
    }

    /**
     * 隐藏模态框
     */
    function hide(): void {
        modalEl.style.display = 'none';
        currentFileName = null;
    }

    /**
     * 注册确认后的回调函数
     */
    function onConfirm(callback: ConfirmCallback): void {
        confirmCallback = callback;
    }

    // 绑定确认按钮的点击事件
    if (confirmDeleteButton) {
        confirmDeleteButton.onclick = () => {
            // 只有当前有目标文件且注册了回调时才执行
            if (currentFileName && confirmCallback) {
                confirmCallback(currentFileName);
            }
            hide();
        };
    }

    // 绑定取消按钮的点击事件
    if (cancelDeleteButton) {
        cancelDeleteButton.onclick = hide;
    }

    // 点击模态框外面的灰色遮罩区域也能关闭（只绑定一次，避免泄漏）
    if (!boundModalIds.has(modalId)) {
        boundModalIds.add(modalId);
        window.addEventListener('click', (event: MouseEvent) => {
            if (event.target === modalEl) {
                hide();
            }
        });
    }

    // 返回控制器对象
    return { show, hide, onConfirm };
}
