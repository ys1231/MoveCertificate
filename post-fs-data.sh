#!/system/bin/sh
# Do NOT assume where your module will be located.
# ALWAYS use $MODDIR if you need to know where this script
# and module is placed.
# This will make sure your module will still work
# if Magisk change its mount point in the future
MODDIR=${0%/*}

. $MODDIR/sh/common.sh
. $MODDIR/sh/built-in.sh
. $MODDIR/sh/compatible.sh
print_log "start move cert !"
print_log "current sdk version is $sdk_version_number"

# 读取模式配置
read_mode_config
print_log "current mode is $CURRENT_MODE"

# 使用 compatible 模式时，清理 builtin 模式遗留的挂载目录文件
# builtin 模式会把证书复制到模块挂载目录（system/、apex/），切回 compatible 后
# 这些文件不会被自动清理，会残留旧证书（甚至在 compatible 挂载失败时意外生效），
# 所以这里主动清空，保证当前生效的证书只来自 compatible 模式的挂载内容
if [ "$CURRENT_MODE" != "builtin" ]; then
    rm -f "$MODULE_SYSTEM_CERT_DIR"/*
    rm -f "$MODULE_APEX_CONSCRYPT_DIR"/*
    rm -f "$MODULE_APEX_CONSCRYPT_NUM_DIR"/*
    print_log "cleaned builtin mode leftovers"
fi

print_log "Record original system certificates"
ls -1 /system/etc/security/cacerts > $MODDIR/system_certs.txt 2>/dev/null
if [ -d "/apex/com.android.conscrypt/cacerts" ]; then
    ls -1 /apex/com.android.conscrypt/cacerts >> $MODDIR/system_certs.txt 2>/dev/null
fi
sort -u $MODDIR/system_certs.txt -o $MODDIR/system_certs.txt

# Android version <= 13 execute
if [ "$sdk_version_number" -le 33 ]; then
    if [ "$CURRENT_MODE" = "builtin" ]; then
        init_low_builtin_method
    else
        init_low_version
    fi
else
    if [ "$CURRENT_MODE" = "builtin" ]; then
        init_high_builtin_method
    else
        init_high_version
    fi
fi

print_log "certificates installed"