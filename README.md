# move Certificate
这是一个Magisk 模块 用于移动用户证书到系统证书.
由于之前网上的已经无法安装遂打算自己写一个.
如果手机是官方镜像,可能就需要借助magisk ,如果是自己编译的直接remount手动移一下就行了.
以下是参考链接:
http://www.zhuoyue360.com/crack/60.html
https://topjohnwu.github.io/Magisk/guides.html#boot-scripts
https://github.com/Magisk-Modules-Repo/movecert
https://github.com/andyacer/movecert
1. 添加用户安装的证书拷贝到系统证书的功能
2. ~~附带下面的自己计算证书名更好的支持系统证书~~
# 使用方法

## 拷贝用户安装的证书到系统证书目录 

1. 安装抓包的证书之后直接重启即可,需要注意的是最新版chrome 即使正确安装系统证书也会校验失败可更换其它浏览器或使用91.0.4472.144版本其他没测

## ~~手动直接安装证书到系统证书目录~~

1. ~~导出抓包软件证书 转换 证书为 pem 格式~~
2. ~~`adb shell "mkdir -p  /data/local/tmp/crt"`~~
3. 获取证书hash

```shell
#openssl版本在1.0以上的版本的执行下面这一句---------------------
openssl x509 -inform PEM -subject_hash_old -in cacert.pem
#openssl版本在1.0以下的版本的执行下面这一句
openssl x509 -inform PEM -subject_hash -in cacert.pem
```

![image-20221109212126575](README.assets/image-20221109212126575.png)

4. ~~手动修改证书(pem格式证书)文件名为`02e06844.0` ~~
5. ~~`mkdir /data/local/tmp/crt`  这个crt目录需要自己创建~~ 
6. ~~`adb push 02e06844.0  /data/local/tmp/crt/`~~
7. ~~证书推到手机后,重启即可生效,其实是移动到magisk挂在的目录.~~

# 补充 证书转换 ~~der to pem~~ der 直接push到手机 安装CA即可

```shell
# 以burp为例
openssl x509 -in burp.der -inform der -outform pem -out burp.pem
# 完成后重复 3.  - 继续
```

