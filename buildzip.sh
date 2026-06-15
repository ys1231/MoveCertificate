#!/bin/bash

# 检查参数
BUILD_WEB=false
AUTO_UPDATE=false
if [ "$1" != "web" ]; then
    BUILD_WEB=true
fi

if [ "$1" == "auto" ]; then
    AUTO_UPDATE=true
fi

if [ "$1" == "all" ]; then
    BUILD_WEB=true
    AUTO_UPDATE=true
fi

# 从 update.json 动态提取版本号
VERSION=$(grep -o '"version": *"[^"]*"' update.json | sed 's/"version": *"\([^"]*\)"/\1/')

# 生成zip文件名
ZIP_FILE="MoveCertificate-${VERSION}.zip"

echo "正在打包: ${ZIP_FILE}"

# 删除旧的zip文件（如果存在）
if [ -f "$ZIP_FILE" ]; then
    echo "删除旧文件: ${ZIP_FILE}"
    rm "$ZIP_FILE"
fi

# 编译 webroot（仅当参数为 web 时）
if [ "$BUILD_WEB" = false ]; then
    echo "正在编译 webroot..."
    cd webdev && npm install && npm run build && cd ..
else
    echo "跳过 webroot 编译..."
fi

# 压缩文件和目录
zip -r "$ZIP_FILE" \
    META-INF \
    webroot \
    sh \
    customize.sh \
    LICENSE \
    *.md \
    module.prop \
    post-fs-data.sh \
    service.sh \
    system.prop \
    update.json \
    README.assets

echo "打包完成: ${ZIP_FILE}"

if [ "$AUTO_UPDATE" = true ]; then
    echo "push and install"
    adb push "$ZIP_FILE" /sdcard/Download/
    adb shell ksud module install /sdcard/Download/"$ZIP_FILE" || true
    adb reboot
else
    echo "跳过 安装更新..."
fi