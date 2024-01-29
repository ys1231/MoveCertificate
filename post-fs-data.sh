#!/system/bin/sh
# Do NOT assume where your module will be located.
# ALWAYS use $MODDIR if you need to know where this script
# and module is placed.
# This will make sure your module will still work
# if Magisk change its mount point in the future
MODDIR=${0%/*}

# This script will be executed in post-fs-data mode
# Android 14 cannot be earlier than Zygote
sdk_version=$(getprop ro.build.version.sdk)
# debug
#sdk_version=34
sdk_version_number=$(expr "$sdk_version" + 0)

if [ "$sdk_version_number" -ge 34 ]; then
    exit 0  
fi

cp -u /system/etc/security/cacerts/* $MODDIR/certificates
cp -u /data/misc/user/0/cacerts-added/* $MODDIR/certificates/
mount -t tmpfs tmpfs /system/etc/security/cacerts/
cp -f $MODDIR/certificates/* /system/etc/security/cacerts/
chown root:root /system/etc/security/cacerts
chown root:root /system/etc/security/cacerts/*
chmod 755 /system/etc/security/cacerts
chmod 644 /system/etc/security/cacerts/*
chcon u:object_r:system_file:s0 /system/etc/security/cacerts/*
