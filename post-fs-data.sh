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
LOG_TAG="iyue"

## Keep only one up-to-date log
echo "[$LOG_TAG] Keep only one up-to-date log" >$LOG_PATH
print_log() {
    echo "[$LOG_TAG] $@" >>$LOG_PATH
}

# PATH DIR
## TMPDIR
TMP_CERT_DIR=$MODDIR/certificates

## Custom certificate directory
CUSTOM_CERT_DIR=/data/local/tmp/cert

## User certificate directory
USER_CERT_DIR=/data/misc/user/0/cacerts-added

## System certificate directory
SYSTEM_CERT_DIR=/system/etc/security/cacerts

## Apex conscrypt directory
APEX_CONSCRYPT_DIR=/apex/com.android.conscrypt/cacerts


move_custom_cert() {
    if [ "$(ls -A $CUSTOM_CERT_DIR)" ]; then
        cp -f $CUSTOM_CERT_DIR/* $TMP_CERT_DIR
        cp -f $CUSTOM_CERT_DIR/* $USER_CERT_DIR
    else
        print_log "The directory $CUSTOM_CERT_DIR is empty."
    fi
    print_log "Install $CUSTOM_CERT_DIR status:$?"
}

fix_user_permissions() {
    # "Fix permissions of the system certificate directory"
    chown -R root:root $USER_CERT_DIR/
    chmod -R 666 $USER_CERT_DIR/
    chown system:system $USER_CERT_DIR
    chmod 755 $USER_CERT_DIR
    print_log "fix user certificate permissions status:$?"
}

fix_system_permissions() {
    chown root:root $SYSTEM_CERT_DIR/
    chown -R root:root $SYSTEM_CERT_DIR/
    chmod -R 644 $SYSTEM_CERT_DIR/
    chmod 755 $SYSTEM_CERT_DIR/
    chcon u:object_r:system_file:s0 $SYSTEM_CERT_DIR/*
    touch -t 200901010800 $SYSTEM_CERT_DIR/*
    touch -t 200901010800 $SYSTEM_CERT_DIR
    print_log "fix permissions $SYSTEM_CERT_DIR status:$?"
}

fix_system_permissions14() {
    chown -R system:system "$1"
    chown root:shell "$1"
    chmod -R 644 "$1"
    chmod 755 "$1"
    touch -t 197001010800 "$1"/*
    touch -t 197001010800 "$1"
    print_log "fix permissions: $?"
}

set_selinux_context(){
    [ "$(getenforce)" = "Enforcing" ] || return 0
    default_selinux_context=u:object_r:system_security_cacerts_file:s0
    selinux_context=$(ls -Zd $1 | awk '{print $1}')

    if [ -n "$selinux_context" ] && [ "$selinux_context" != "?" ]; then
        chcon -R $selinux_context $2
    else
        chcon -R $default_selinux_context $2
    fi
}

compatible(){
    # compatible adguard or other
    # Hash 47ec1af8 is for "AdGuard Intermediate CA" intermediate.
    print_log "Compatible adguard"
    cert_dir=$TMP_CERT_DIR
    print_log "Running compatibility cleanup for potentially conflicting certificates."

    # Remove by filename pattern (hash: 47ec1af8.*)
    rm -f "$cert_dir"/47ec1af8.*
    print_log "Removed files matching '47ec1af8.*'."

    # Remove by content string "Guard Personal Intermediate"
    for cert_file in "$cert_dir"/*; do
        # Ensure it is a file before trying to read it
        if [ -f "$cert_file" ]; then
            # Use grep -q for a silent, efficient check
            if grep -q "Guard Personal Intermediate" "$cert_file"; then
                print_log "Removing file containing 'Guard Personal Intermediate': $(basename "$cert_file")"
                rm -f "$cert_file"
            fi
        fi
    done
    print_log "Compatibility cleanup status:$?"
}

# Android version <= 13 execute
if [ "$sdk_version_number" -le 33 ]; then
    print_log "start move cert !"
    print_log "current sdk version is $sdk_version_number"
    print_log "Backup $SYSTEM_CERT_DIR"
    cp -u $SYSTEM_CERT_DIR/* $TMP_CERT_DIR
    print_log "Backup $USER_CERT_DIR"
    cp -u $USER_CERT_DIR/* $TMP_CERT_DIR
    # Android 13 or lower versions perform
    move_custom_cert
    fix_user_permissions
    compatible
    selinux_context=$(ls -Zd $SYSTEM_CERT_DIR | awk '{print $1}')
    mount -t tmpfs tmpfs $SYSTEM_CERT_DIR
    print_log "mount $SYSTEM_CERT_DIR status:$?"
    
    cp -f $TMP_CERT_DIR/* $SYSTEM_CERT_DIR
    
    print_log "Install $SYSTEM_CERT_DIR status:$?"
    fix_system_permissions
    print_log "certificates installed"
    [ "$(getenforce)" = "Enforcing" ] || return 0
    default_selinux_context=u:object_r:system_security_cacerts_file:s0
    if [ -n "$selinux_context" ] && [ "$selinux_context" != "?" ]; then
        chcon -R $selinux_context $SYSTEM_CERT_DIR
    else
        chcon -R $default_selinux_context $SYSTEM_CERT_DIR
    fi
else

    print_log "start move cert !"
    print_log "current sdk version is $sdk_version_number"
    
    print_log "Backup $APEX_CONSCRYPT_DIR"
    cp -u $APEX_CONSCRYPT_DIR/* $TMP_CERT_DIR
    print_log "Backup $USER_CERT_DIR"
    cp -u $USER_CERT_DIR/* $TMP_CERT_DIR
    move_custom_cert
    fix_user_permissions
    fix_system_permissions14 $TMP_CERT_DIR
    compatible
    
    print_log "find system conscrypt directory"
    apex_dir=$(find /apex -type d -name "com.android.conscrypt@*")
    print_log "find conscrypt directory: $apex_dir"

    set_selinux_context $APEX_CONSCRYPT_DIR $TMP_CERT_DIR
    # These two directories are mapped to the same block
    mount -o bind $TMP_CERT_DIR $APEX_CONSCRYPT_DIR
    print_log "mount bind $TMP_CERT_DIR $APEX_CONSCRYPT_DIR status:$?"
    mount -o bind $TMP_CERT_DIR $apex_dir/cacerts
    print_log "mount bind $TMP_CERT_DIR $apex_dir/cacerts status:$?"
    for pid in 1 $(pgrep zygote) $(pgrep zygote64); do
            nsenter --mount=/proc/${pid}/ns/mnt -- mount --rbind $TMP_CERT_DIR $APEX_CONSCRYPT_DIR
            nsenter --mount=/proc/${pid}/ns/mnt -- mount --rbind $TMP_CERT_DIR $apex_dir/cacerts
    done
    print_log "certificates installed"
fi
