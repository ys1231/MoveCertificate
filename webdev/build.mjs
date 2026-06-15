/**
 * MoveCertificate 构建脚本
 * 
 * 构建流程：
 *   1. esbuild 打包 JS（含模块合并 + 压缩）
 *   2. esbuild 打包 CSS（压缩）
 *   3. 复制 index.html 并自动替换资源引用为带 hash 的文件名
 *   4. 通过 javascript-obfuscator 的 API 混淆 JS（不走 CLI，无广告）
 * 
 * 使用方式：
 *   node build.mjs         → 构建 Release
 *   node build.mjs --serve → 开发模式（不混淆，带 sourcemap，监听文件变化）
 */

import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JavaScriptObfuscator from 'javascript-obfuscator';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes('--serve');

// 输入文件
const JS_ENTRY = 'src/main.ts';
const CSS_ENTRY = 'styles/main.css';
const HTML_SRC = 'index.html';

// 输出目录
const OUT_DIR = path.join(__dirname, '..', 'webroot');

// ==================== 构建入口 ====================

async function build() {
    console.log('🔨 开始构建...\n');

    // 第一步：esbuild 打包 JS
    const jsHash = await buildJS();
    // 第二步：esbuild 打包 CSS
    const cssHash = await buildCSS();
    // 第三步：复制 HTML 并替换引用
    copyHTML(jsHash, cssHash);

    console.log(`✅ 构建完成 → ${OUT_DIR}/`);
    console.log(`   index.html\n   main.${jsHash}.js\n   main.${cssHash}.css\n`);
}

// ==================== JS 打包 + 混淆 ====================

async function buildJS() {
    // 先用 esbuild 生成唯一的 hash 文件名（不写入文件，只获取 hash）
    const tempResult = await esbuild.build({
        entryPoints: [JS_ENTRY],
        bundle: true,
        format: 'esm',
        minify: !isDev,
        sourcemap: isDev,
        write: false,
        outdir: OUT_DIR,
        entryNames: 'main.[hash]',
        // 目标环境：Android WebView（Chromium）
        target: 'chrome90',
    });

    // 从输出文件名中提取 hash
    const jsFileName = path.basename(tempResult.outputFiles[0].path);
    const jsHash = jsFileName.replace('main.', '').replace('.js', '');
    const jsOutPath = tempResult.outputFiles[0].path;

    let jsCode = tempResult.outputFiles[0].text;

    if (!isDev) {
        // 通过 API 调用混淆器（不走 CLI，无广告）
        const obfuscationResult = JavaScriptObfuscator.obfuscate(jsCode, {
            compact: true,
            controlFlowFlattening: false,
            deadCodeInjection: false,
            stringArray: true,
            stringArrayThreshold: 0.5,
            // 不混淆 kernelsu 的 import，因为它是外部依赖
            identifiersPrefix: '',
        });
        jsCode = obfuscationResult.getObfuscatedCode();
    }

    // 写入最终文件
    fs.writeFileSync(path.join(OUT_DIR, jsFileName), jsCode);
    console.log(`   📦 JS  → main.${jsHash}.js`);

    return jsHash;
}

// ==================== CSS 打包 ====================

async function buildCSS() {
    const result = await esbuild.build({
        entryPoints: [CSS_ENTRY],
        bundle: true,
        minify: !isDev,
        sourcemap: isDev,
        write: true,
        outdir: OUT_DIR,
        entryNames: 'main.[hash]',
        loader: { '.css': 'css' },
    });

    // 从输出的 metafile 或直接读文件获取 hash
    // esbuild write 模式下文件名包含 hash，我们需要找到它
    const files = fs.readdirSync(OUT_DIR);
    const cssFile = files.find(f => f.startsWith('main.') && f.endsWith('.css') && !f.endsWith('.css.map'));
    if (!cssFile) throw new Error('构建产物中未找到 CSS 文件');
    const cssHash = cssFile.replace('main.', '').replace('.css', '');

    console.log(`   🎨 CSS → main.${cssHash}.css`);

    return cssHash;
}

// ==================== HTML 复制并替换引用 ====================

function copyHTML(jsHash, cssHash) {
    const html = fs.readFileSync(HTML_SRC, 'utf-8');

    // 构建输出文件名
    // 有 hash 时：main.ABC123.css；无 hash（dev）时：main.css
    const cssName = cssHash ? `main.${cssHash}.css` : 'main.css';
    const jsName = jsHash ? `main.${jsHash}.js` : 'main.js';

    // 将 <link> 和 <script> 的 href/src 替换为构建产物文件名
    // 匹配源文件中的 styles/main.css 和 js/main.ts
    const updated = html
        .replace(
            /<link\s+[^>]*href="[^"]*\.css"/,
            `<link rel="stylesheet" href="${cssName}"`
        )
        .replace(
            /<script\s+[^>]*\btype="module"[^>]*\bsrc="[^"]*\.[jt]s"[^>]*>|<script\s+[^>]*\bsrc="[^"]*\.[jt]s"[^>]*\btype="module"[^>]*>/,
            `<script src="${jsName}" type="module">`
        );

    fs.writeFileSync(path.join(OUT_DIR, 'index.html'), updated);
    console.log(`   📄 HTML → index.html`);
}

// ==================== 开发服务器 ====================

async function serve() {
    // 确保输出目录存在
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const ctx = await esbuild.context({
        entryPoints: [JS_ENTRY, CSS_ENTRY],
        bundle: true,
        format: 'esm',
        minify: false,
        sourcemap: true,
        outdir: OUT_DIR,
        entryNames: 'main',
        target: 'chrome90',
        loader: { '.css': 'css' },
    });

    await ctx.watch();
    console.log('👀 监听文件变化中... 修改代码后自动重新构建\n');

    // 复制一次 HTML（不带 hash）
    copyHTML('', '');

    // 保持进程运行
    process.stdin.resume();
}

// ==================== 启动 ====================

if (isDev) {
    serve();
} else {
    build();
}
