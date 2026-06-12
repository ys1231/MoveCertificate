#!/system/bin/sh
MODDIR=${0%/*}

# 使用兼容模式

init_low_version() {

    # Android 13 or lower versions perform
    print_log "Use tmpfs $SYSTEM_CERT_DIR"
    print_log "Backup $SYSTEM_CERT_DIR"
    cp -u $SYSTEM_CERT_DIR/* $MODULE_CERT_DIR
    print_log "Backup $USER_CERT_DIR"
    cp -u $USER_CERT_DIR/* $MODULE_CERT_DIR

    move_custom_cert
    fix_user_permissions
    compatible
    selinux_context=$(ls -Zd $SYSTEM_CERT_DIR | awk '{print $1}')
    mount -t tmpfs tmpfs $SYSTEM_CERT_DIR
    print_log "mount $SYSTEM_CERT_DIR status:$?"
    
    cp -f $MODULE_CERT_DIR/* $SYSTEM_CERT_DIR
    
    print_log "Install $SYSTEM_CERT_DIR status:$?"
    fix_system_permissions $SYSTEM_CERT_DIR
    print_log "certificates installed"
    [ "$(getenforce)" = "Enforcing" ] || return 0
    default_selinux_context=u:object_r:system_security_cacerts_file:s0
    if [ -n "$selinux_context" ] && [ "$selinux_context" != "?" ]; then
        chcon -R $selinux_context $SYSTEM_CERT_DIR
    else
        chcon -R $default_selinux_context $SYSTEM_CERT_DIR
    fi
}


init_high_version(){

    print_log "Use mount $TEMP_DIR"
    mkdir -p $TEMP_DIR
    print_log "Backup $APEX_CONSCRYPT_DIR"
    cp -u $APEX_CONSCRYPT_DIR/* $MODULE_CERT_DIR
    print_log "Backup $USER_CERT_DIR"
    cp -u $USER_CERT_DIR/* $MODULE_CERT_DIR
    move_custom_cert
    fix_user_permissions
    fix_system_permissions14 $MODULE_CERT_DIR
    compatible
    
    print_log "find system conscrypt directory"
    apex_dir=$(find /apex -type d -name "com.android.conscrypt@*")
    print_log "find conscrypt directory: $apex_dir"

    mount -t tmpfs tmpfs $TEMP_DIR
    print_log "mount $TEMP_DIR status:$?"
    cp -f $MODULE_CERT_DIR/* $TEMP_DIR
    fix_system_permissions14 $TEMP_DIR
    # set_selinux_context $APEX_CONSCRYPT_DIR $MODULE_CERT_DIR
    set_selinux_context $APEX_CONSCRYPT_DIR $TEMP_DIR

    # These two directories are mapped to the same block
    mount -o bind $TEMP_DIR $APEX_CONSCRYPT_DIR
    print_log "mount bind $MODULE_CERT_DIR $APEX_CONSCRYPT_DIR status:$?"
    mount -o bind $TEMP_DIR $apex_dir/cacerts
    print_log "mount bind $TEMP_DIR $apex_dir/cacerts status:$?"
    for pid in 1 $(pgrep zygote) $(pgrep zygote64); do
            nsenter --mount=/proc/${pid}/ns/mnt -- mount --bind $TEMP_DIR $APEX_CONSCRYPT_DIR
            nsenter --mount=/proc/${pid}/ns/mnt -- mount --bind $TEMP_DIR $apex_dir/cacerts
    done
    umount $TEMP_DIR
    rmdir $TEMP_DIR
    print_log "umount $TEMP_DIR status:$?"
}
