# move Certificate
这是一个Magisk 模块 用于移动用户证书到系统证书.
由于之前网上的已经无法安装遂打算自己写一个.
如果手机是官方镜像,可能就需要借助magisk ,如果是自己编译的直接remount手动移一下就行了.
以下是参考链接:
http://www.zhuoyue360.com/crack/60.html
https://topjohnwu.github.io/Magisk/guides.html#boot-scripts
https://github.com/Magisk-Modules-Repo/movecert

# 使用方法
1. 导出抓包软件证书 转换 证书为 pem 格式
2. `adb shell "mkdir -p  /data/local/tmp/crt"`
3. 获取证书hash 

```shell
#openssl版本在1.0以上的版本的执行下面这一句---------------------
openssl x509 -inform PEM -subject_hash_old -in cacert.pem
#openssl版本在1.0以下的版本的执行下面这一句
openssl x509 -inform PEM -subject_hash -in cacert.pem
```

![image-20221109212126575](README.assets/image-20221109212126575.png)

4. 手动修改证书(pem格式证书)文件名为`02e06844.0` 
5. `adb push 02e06844.0  /data/local/tmp/crt/`
6. 证书推到手机后,重启即可生效.

# 补充 证书转换 der to pem

```shell
# 以burp为例
openssl x509 -in burp.der -inform der -outform pem -out burp.pem
# 完成后重复 3.  - 继续
```

