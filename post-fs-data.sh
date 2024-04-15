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

# add logcat
LOG_PATH="$MODDIR/install.log"
LOG_TAG="iyue_MoveCertificate"

# Keep only one up-to-date log
echo "[$LOG_TAG] Keep only one up-to-date log" >$LOG_PATH

print_log() {
    echo "[$LOG_TAG] $@" >>$LOG_PATH
}

move_custom_cert() {
    print_log "Backup user custom certificates"
    if [ "$(ls -A /data/local/tmp/cert)" ]; then
        cp -f /data/local/tmp/cert/* $MODDIR/certificates
        cp -f /data/local/tmp/cert/* /data/misc/user/0/cacerts-added/
    else
        print_log "The directory '/data/local/tmp/cert' is empty."
    fi
    print_log "Backup user custom certificates status:$?"
}

fix_user_permissions() {
    # "Fix permissions of the system certificate directory"
    print_log "fix user permissions: /data/misc/user/0/cacerts-added/"
    chown -R root:root /data/misc/user/0/cacerts-added/
    chmod -R 666 /data/misc/user/0/cacerts-added/
    chown system:system /data/misc/user/0/cacerts-added
    chmod 755 /data/misc/user/0/cacerts-added
    print_log "fix user permissions status:$?"
}

fix_system_permissions() {
    # diff
    print_log "fix permissions /system/etc/security/cacerts"
    chown root:root /system/etc/security/cacerts
    chown -R root:root /system/etc/security/cacerts/
    chmod -R 644 /system/etc/security/cacerts/
    chmod 755 /system/etc/security/cacerts
    chcon u:object_r:system_file:s0 /system/etc/security/cacerts/*
    print_log "move cert status:$?"
}

fix_system_permissions14() {
    # diff
    print_log "fix permissions: $1"
    chown -R system:system "$1"
    chown root:shell "$1"
    chmod -R 644 "$1"
    chmod 755 "$1"
    print_log "fix permissions: $?"
}

set_selinux_context(){
    [ "$(getenforce)" = "Enforcing" ] || return 0
    default_selinux_context=u:object_r:system_file:s0
    selinux_context=$(ls -Zd $1 | awk '{print $1}')

    if [ -n "$selinux_context" ] && [ "$selinux_context" != "?" ]; then
        chcon -R $selinux_context $2
    else
        chcon -R $default_selinux_context $2
    fi
}

# Android version <= 13 execute
if [ "$sdk_version_number" -le 33 ]; then
    print_log "start move cert !"
    print_log "current sdk version is $sdk_version_number"
    print_log "Backup system certificates"
    cp -u /system/etc/security/cacerts/* $MODDIR/certificates
    cp -u /data/misc/user/0/cacerts-added/* $MODDIR/certificates/
    # Android 13 or lower versions perform
    print_log "Backup user custom certificates"
    move_custom_cert
    fix_user_permissions

    print_log "mount: /system/etc/security/cacerts"
    selinux_context=$(ls -Zd /system/etc/security/cacerts | awk '{print $1}')
    mount -t tmpfs tmpfs /system/etc/security/cacerts
    print_log "mount status:$?"

    print_log "move cert: /system/etc/security/cacerts"
    cp -f $MODDIR/certificates/* /system/etc/security/cacerts
    print_log "move cert status:$?"
    fix_system_permissions
    print_log "certificates installed"
    [ "$(getenforce)" = "Enforcing" ] || return 0
    default_selinux_context=u:object_r:system_file:s0
    if [ -n "$selinux_context" ] && [ "$selinux_context" != "?" ]; then
        chcon -R $selinux_context /system/etc/security/cacerts
    else
        chcon -R $default_selinux_context /system/etc/security/cacerts
    fi
else

    print_log "start move cert !"
    print_log "current sdk version is $sdk_version_number"
    print_log "Backup system certificates"
    mount -t tmpfs tmpfs $MODDIR/certificates
    cp -u /apex/com.android.conscrypt/cacerts/* $MODDIR/certificates
    cp -u /data/misc/user/0/cacerts-added/* $MODDIR/certificates
    print_log "Backup user custom certificates"
    move_custom_cert
    fix_user_permissions
    fix_system_permissions14 $MODDIR/certificates

    print_log "find system conscrypt directory"
    apex_dir=$(find /apex -type d -name "com.android.conscrypt@*")
    print_log "find conscrypt directory: $apex_dir"

    set_selinux_context /apex/com.android.conscrypt/cacerts $MODDIR/certificates
    # These two directories are mapped to the same block
    mount -o bind $MODDIR/certificates /apex/com.android.conscrypt/cacerts
    mount -o bind $MODDIR/certificates $apex_dir/cacerts
    print_log "certificates installed"
fi
