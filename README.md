# [MoveCertificate](https://github.com/ys1231/MoveCertificate)

[English](README.en.md) | [Türkçe](README.tr.md)

这是一个`Magisk/KernelSU/APatch`模块 用于移动用户证书到系统证书.支持`Android 7-16`
如果手机是官方镜像,可能就需要借助模块,如果是自己编译的直接内置或者`remount`手动移一下就行了.

# 使用方法 

- 优先使用系统设置安装, 不需要处理编码问题

1. 导出证书后直接`push`到手机,使用系统设置正常安装证书,完了重启即可,不需要格式转换.
2. 可搭配 [appproxy](https://github.com/ys1231/appproxy) vpn代理工具.


## 手动安装证书到系统证书目录

- **此方法会覆盖已有的证书，专为多台电脑和内置证书准备**
- 正常情况下,不需要此场景.
- Reqable 直接导出的HASH.0 不一定能用, 建议导出crt, 使用系统设置正常安装或使用下面命令转换否则即使证书文件移动成功, 因为编码问题系统也无法识别

0. 如果证书已经移动过或者内置到源码中，会发现直接通过系统安装，实际证书并没有被安装进去，需要保留这种场景
1. 导出抓包软件证书 转换 证书为 pem 格式
2. 获取 der 证书 

```shell
# pem 证书 Android 系统使用 der 所以移动后的证书格式需要转成 der
## 1. 计算 hash 二选一
openssl x509 -inform PEM -subject_hash_old -in cacert.pem
openssl x509 -inform PEM -subject_hash -in cacert.pem
## 2. 转der
openssl x509 -in cacert.pem -outform der -out cacert.der
### 或者 crt
openssl x509 -in cacert.crt -outform der -out cacert.der
mv cacert.der 02e06844.0

# der 证书 
## 1. 计算 der HASH 二选一
openssl x509 -in cacert.der -inform der -subject_hash_old -noout
openssl x509 -in cacert.der -inform der -subject_hash -noout
## 2. 重命名证书为 hash值.0
mv cacert.der 02e06844.0
# 或者直接使用手机安装后,提取用户目录的证书出来,就不需要考虑计算和格式转换问题.
```

![20221109212126575](README.assets/20221109212126575.png)

3. 获取到 der 格式证书`02e06844.0`,或者共存`02e06844.1`
4. `adb push 02e06844.0  /data/local/tmp/cert/`
5. 重启即可

## MoveCertificate web

- 这是一个 web 网页用于 MoveCertificate 模块显示已安装的证书列表。
- 同时也可以查看模块安装证书的详细信息。
- 以及长按可以删除已安装的证书。

# 打包命令
```shell
./buildzip.sh all
```
# 使用实测
![2024-02-19_01.27.27](README.assets/2024-02-19_01.27.27.png)

## Star History

[![Star History Chart](https://star-history.dera.page/svg?repos=ys1231/MoveCertificate&type=Date)](https://star-history.dera.page/#ys1231/MoveCertificate&Date)

# 参考链接:
- http://www.zhuoyue360.com/crack/60.html
- https://topjohnwu.github.io/Magisk/guides.html#boot-scripts
- https://github.com/Magisk-Modules-Repo/movecert
- https://github.com/andyacer/movecert
- https://book.hacktricks.xyz/v/cn/mobile-pentesting/android-app-pentesting/install-burp-certificate#android-14-zhi-hou 
- https://kernelsu.org/zh_CN/guide/module.html
