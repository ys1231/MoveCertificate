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
LOG_PATH="$MODDIR/install_14.log"
LOG_TAG="iyue_MoveCertificate"

# Keep only one up-to-date log
echo "[$LOG_TAG] Keep only one up-to-date log" >$LOG_PATH

print_log() {
    echo "[$LOG_TAG] $@" >>$LOG_PATH
}

move_user_cert() {

    if [ "$(ls -A /data/local/tmp/cert)" ]; then
        print_log "Backup user custom certificates"
        cp -f /data/local/tmp/cert/* $MODDIR/certificates/
        cp -f /data/local/tmp/cert/* /data/misc/user/0/cacerts-added/
        print_log "Backup user custom certificates status:$?"
    else
        print_log "The directory '/data/local/tmp/cert' is empty."
    fi

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
    print_log "fix permissions: $1"
    chown -R system:system "$1"
    chown root:shell "$1"
    chmod -R 644 "$1"
    chmod 755 "$1"
    print_log "fix permissions: $?"
}

# Android version >= 14 execute
if [ "$sdk_version_number" -ge 34 ]; then

    print_log "start move cert !"
    print_log "current sdk version is $sdk_version_number"
    print_log "Backup system certificates"
    cp -u /data/misc/user/0/cacerts-added/* $MODDIR/certificates/
    cp -u /apex/com.android.conscrypt/cacerts/* $MODDIR/certificates/
    print_log "Backup user custom certificates"
    move_user_cert
    fix_user_permissions
    fix_system_permissions $MODDIR/certificates

    print_log "find system conscrypt directory"
    apex_dir=$(find /apex -type d -name "com.android.conscrypt@*")
    print_log "find conscrypt directory: $apex_dir"

    print_log "Mounting certificates to zygote and apps"
    ZYGOTE_PID=$(pidof zygote || true)
    ZYGOTE64_PID=$(pidof zygote64 || true)

    for Z_PID in "$ZYGOTE_PID" "$ZYGOTE64_PID"; do
        if [ -n "$Z_PID" ]; then
            nsenter --mount=/proc/$Z_PID/ns/mnt -- /bin/mount --bind $MODDIR/certificates /apex/com.android.conscrypt/cacerts
            nsenter --mount=/proc/$Z_PID/ns/mnt -- /bin/mount --bind $MODDIR/certificates $apex_dir/cacerts
        fi
    done
    print_log "certificates installed$?"
fi
