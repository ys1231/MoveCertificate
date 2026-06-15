/**
 * Android WebView 运行环境类型声明
 * 
 * 在 Android 设备上，KernelSU/Magisk WebUI 会注入一个全局 ksu 对象，
 * kernelsu npm 包通过这个全局对象调用底层 shell 命令。
 * 
 * 此文件声明了这些运行时可用的全局变量，让 TypeScript 不会报错。
 */

/** KernelSU WebUI 注入的全局对象 */
declare global {
    interface Window {
        /** KernelSU 运行时桥接对象（Android 环境注入） */
        ksu: KsuRuntime;
    }
}

/**
 * ksu 对象的运行时接口
 * 对应 Android 端 KernelSU WebUI 注入的原生方法
 */
interface KsuRuntime {
    /** 执行 shell 命令 */
    exec(command: string, optionsJson: string, callbackName: string): void;

    /** 启动子进程 */
    spawn(command: string, argsJson: string, optionsJson: string, callbackName: string): void;

    /** 切换全屏模式 */
    fullScreen(isFullScreen: boolean): void;

    /** 启用边到边显示 */
    enableEdgeToEdge(enable: boolean): void;

    /** 显示 Toast 提示 */
    toast(message: string): void;

    /** 获取模块信息 */
    moduleInfo(): string;

    /** 列出包名 */
    listPackages(type: string): string;

    /** 获取包详细信息 */
    getPackagesInfo(packagesJson: string): string;

    /** 退出 WebUI */
    exit(): void;
}

export {};
