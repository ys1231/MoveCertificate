#!/system/bin/sh
MODDIR=${0%/*}

# 使用内置方法

init_low_builtin_method() {

    print_log "Use built-in method"
    # mkdir -p $MODULE_SYSTEM_CERT_DIR
    print_log "Backup $USER_CERT_DIR to $MODULE_CERT_DIR"
    cp -u $USER_CERT_DIR/* $MODULE_CERT_DIR
    move_custom_cert
    compatible
    cp -f $MODULE_CERT_DIR/* $MODULE_SYSTEM_CERT_DIR
    print_log "Install $MODULE_SYSTEM_CERT_DIR status:$?"
    fix_system_permissions $MODULE_SYSTEM_CERT_DIR
    print_log "Fix $MODULE_SYSTEM_CERT_DIR permissions status:$?" 
    set_selinux_context $SYSTEM_CERT_DIR $MODULE_SYSTEM_CERT_DIR
    
}

init_high_builtin_method() {
    
    print_log "Use built-in method"
    # mkdir -p $MODULE_SYSTEM_CERT_DIR
    print_log "Backup $USER_CERT_DIR to $MODULE_CERT_DIR"
    cp -u $USER_CERT_DIR/* $MODULE_CERT_DIR
    move_custom_cert
    compatible
    cp -f $MODULE_CERT_DIR/* $MODULE_APEX_CONSCRYPT_DIR
    print_log "Install $MODULE_APEX_CONSCRYPT_DIR status:$?"
    fix_system_permissions14 $MODULE_APEX_CONSCRYPT_DIR
    print_log "Fix $MODULE_APEX_CONSCRYPT_DIR permissions status:$?" 
    set_selinux_context $APEX_CONSCRYPT_DIR $MODULE_APEX_CONSCRYPT_DIR
    
}
