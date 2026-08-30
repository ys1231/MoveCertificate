# [MoveCertificate](https://github.com/ys1231/MoveCertificate)

[English](README.en.md) | [中文](README.md)

Kullanıcı sertifikalarını sistem sertifikalarına taşımak için bir `Magisk/KernelSU/APatch` modülü. `Android 7-16` destekler.
Eğer telefonunuz resmi bir imaja sahipse, bu modüle ihtiyacınız olabilir. Kendi ROM'unuzu derliyorsanız, sertifikayı doğrudan içine ekleyebilir veya `remount` kullanarak manuel olarak taşıyabilirsiniz.

# Kullanım

- Sistem ayarları üzerinden kurulumu tercih edin, kodlama sorunlarıyla uğraşmanıza gerek yok

1. Sertifikayı dışa aktardıktan sonra, doğrudan telefonunuza `push` yapın ve sistem ayarları üzerinden normal şekilde yükleyin, ardından yeniden başlatın. Format dönüşümüne gerek yoktur.
2. [appproxy](https://github.com/ys1231/appproxy) VPN proxy aracı ile kullanılabilir.

## Sistem Sertifika Dizinine Manuel Sertifika Kurulumu

- **Bu yöntem mevcut sertifikaların üzerine yazar, birden fazla bilgisayar ve yerleşik sertifikalar için tasarlanmıştır**
- Normalde bu senaryoya ihtiyaç yoktur.
- Reqable'ın doğrudan dışa aktardığı HASH.0 her zaman çalışmayabilir. crt dışa aktarmanız ve sistem ayarları üzerinden normal şekilde kurmanız veya aşağıdaki komutları kullanarak dönüştürmeniz önerilir. Aksi takdirde, sertifika dosyası başarıyla taşınsa bile, kodlama sorunları nedeniyle sistem onu tanımayacaktır.

0. Eğer sertifika daha önce taşınmışsa veya kaynak koduna yerleştirilmişse, sistem üzerinden doğrudan kurulumun aslında sertifikayı kurmadığını göreceksiniz. Bu senaryo korunmalıdır.

1. Paket yakalama yazılımı sertifikasını dışa aktarın ve pem formatına dönüştürün
2. der sertifikasını alın

```shell
# pem sertifikaları için (Android sistemi der kullanır, bu yüzden taşınan sertifikanın der'ye dönüştürülmesi gerekir)
## 1. Hash hesapla (ikisinden biri)
openssl x509 -inform PEM -subject_hash_old -in cacert.pem
openssl x509 -inform PEM -subject_hash -in cacert.pem
## 2. der'ye dönüştür
openssl x509 -in cacert.pem -outform der -out cacert.der
### Veya crt'den
openssl x509 -in cacert.crt -outform der -out cacert.der
mv cacert.der 02e06844.0

# der sertifikaları için
## 1. der hash'ini hesapla (ikisinden biri)
openssl x509 -in cacert.der -inform der -subject_hash_old -noout
openssl x509 -in cacert.der -inform der -subject_hash -noout
## 2. Sertifikayı hash.0 olarak yeniden adlandır
mv cacert.der 02e06844.0
# Veya telefon kurulumundan sonra doğrudan kullanıcı dizininden sertifikayı çıkarabilirsiniz, hesaplama ve format dönüşümü endişesine gerek yok.
```

![20221109212126575](README.assets/20221109212126575.png)

3. der formatındaki `02e06844.0` sertifikasını alın veya `02e06844.1` olarak birlikte var olun
4. `adb push 02e06844.0  /data/local/tmp/cert/`
5. Yeniden başlatmanız yeterli.

## MoveCertificate web

- Kurulu sertifikaların listesini görüntülemek için MoveCertificate modülüne ait bir web sayfası.
- Modül tarafından kurulan sertifikaların ayrıntılı bilgilerini de görüntüleyebilir.
- Sertifikaları silmek için uzun basın.

# Derleme Komutu
```shell
./buildzip.sh all
```

# Test Sonuçları
![2024-02-19_01.27.27](README.assets/2024-02-19_01.27.27.png)

## Yıldız Geçmişi

[![Star History Chart](https://star-history.dera.page/svg?repos=ys1231/MoveCertificate&type=Date)](https://star-history.dera.page/#ys1231/MoveCertificate&Date)

# Referanslar:
- http://www.zhuoyue360.com/crack/60.html
- https://topjohnwu.github.io/Magisk/guides.html#boot-scripts
- https://github.com/Magisk-Modules-Repo/movecert
- https://github.com/andyacer/movecert
- https://book.hacktricks.xyz/v/cn/mobile-pentesting/android-app-pentesting/install-burp-certificate#android-14-zhi-hou 
- https://kernelsu.org/zh_CN/guide/module.html 
