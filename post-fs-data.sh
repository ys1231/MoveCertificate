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