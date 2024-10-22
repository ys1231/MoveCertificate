# MoveCertificate web

- 这是一个 web 网页用于 MoveCertificate 模块显示已安装的证书列表。
- 同时也可以查看模块安装证书的详细信息。
- 以及长按可以删除已安装的证书。

# Use guide
```shell
# 初始化项目
npm install
# 编译
rm -rf ./webroot/* && parcel build index.html -d webroot
# 安装 需配合 magiskssh 模块使用
scp ./webroot/*  root@192.168.1.3:/data/adb/modules/MoveCertificate/webroot/

```