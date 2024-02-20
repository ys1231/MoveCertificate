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
    chown -R root:root $MODDIR/certificates/
    chmod -R 644 $MODDIR/certificates
    chmod 755 $MODDIR/certificates
    # Copy out the existing certificates
    cp -u /system/etc/security/cacerts/* $MODDIR/certificates/
    # Move our new certificate, so we trust that too
    cp -u /data/misc/user/0/cacerts-added/* $MODDIR/certificates/
    # Create the in-memory mount on top of the system certs folder
    mount -t tmpfs tmpfs /apex/com.android.conscrypt/cacerts/
    # Copy the existing certs back into the tmpfs, so we keep trusting them
    cp -f $MODDIR/certificates/* /apex/com.android.conscrypt/cacerts/
    # Update the perms & selinux context labels
    chown -R system:system /apex/com.android.conscrypt/cacerts/
    chown root:shell /apex/com.android.conscrypt/cacerts
    chmod -R 644 /apex/com.android.conscrypt/cacerts/
    chmod 755 /apex/com.android.conscrypt/cacerts/
else
    cp -u /system/etc/security/cacerts/* $MODDIR/certificates
    cp -u /data/misc/user/0/cacerts-added/* $MODDIR/certificates/
    chown -R root:root $MODDIR/certificates/
    chmod -R 644 $MODDIR/certificates
    chmod 755 $MODDIR/certificates
    mount -t tmpfs tmpfs /system/etc/security/cacerts/
    cp -f $MODDIR/certificates/* /system/etc/security/cacerts/
    chown root:root /system/etc/security/cacerts
    chown -R root:root /system/etc/security/cacerts/
    chmod -R 644 /system/etc/security/cacerts/
    chmod 755 /system/etc/security/cacerts
    chcon u:object_r:system_file:s0 /system/etc/security/cacerts/*
fi
