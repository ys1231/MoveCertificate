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

mount_cert() {
    # "Mount a temporary directory to overwrite the system certificate directory"
    print_log "mount: $1"
    mount -t tmpfs tmpfs "$1"
    print_log "mount status:$?"

    # "Copy all certificates to the system certificate directory"
    print_log "move cert: $1"
    cp -f $MODDIR/certificates/* "$1"

    print_log "fix permissions: $1"
    chown -R system:system "$1"
    chown root:shell "$1"
    chmod -R 644 "$1"
    chmod 755 "$1"
    print_log "move cert status:$?"
}

mount_user_cert() {
    print_log "Backup user custom certificates"
    if [ "$(ls -A /data/local/tmp/cert)" ]; then
        cp -f /data/local/tmp/cert/* $MODDIR/certificates/
        cp -f /data/local/tmp/cert/* /data/misc/user/0/cacerts-added/
    else
        print_log "The directory '/data/local/tmp/cert' is empty."
    fi
    print_log "Backup user custom certificates status:$?"
}

fix_permissions() {
    # "Fix permissions of the system certificate directory"
    print_log "fix permissions: /data/misc/user/0/cacerts-added/"
    chown -R root:root /data/misc/user/0/cacerts-added/
    chmod -R 666 /data/misc/user/0/cacerts-added/
    chown system:system /data/misc/user/0/cacerts-added
    chmod 755 /data/misc/user/0/cacerts-added
    print_log "fix permissions status:$?"
}

# Android version >= 14 execute
if [ "$sdk_version_number" -ge 34 ]; then
    print_log "start move cert !"
    print_log "current sdk version is $sdk_version_number"
    print_log "Backup system certificates"
    cp -u /system/etc/security/cacerts/* $MODDIR/certificates
    cp -u /data/misc/user/0/cacerts-added/* $MODDIR/certificates/
    cp -u /apex/com.android.conscrypt/cacerts/* $MODDIR/certificates/

    print_log "Backup user custom certificates"
    mount_user_cert
    fix_permissions

    print_log "find system conscrypt directory"
    apex_dir=$(find /apex -type d -name "com.android.conscrypt@*")
    print_log "find conscrypt directory: $apex_dir"
    mount_cert "$apex_dir/cacerts/"
    mount_cert /apex/com.android.conscrypt/cacerts/
    print_log "certificates installed"
fi


