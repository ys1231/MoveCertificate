#!/system/bin/sh
# Do NOT assume where your module will be located.
# ALWAYS use $MODDIR if you need to know where this script
# and module is placed.
# This will make sure your module will still work
# if Magisk change its mount point in the future
MODDIR=${0%/*}

# This script will be executed in late_start service mode
# At this point, the system has already started
# sdk_version=$(getprop ro.build.version.sdk)
# debug
#sdk_version=34
# sdk_version_number=$(expr "$sdk_version" + 0)

# if [ "$sdk_version_number" -le 33 ]; then
    # Android version less than 14
    # exit 0
# fi

# wait for boot to complete
# while [ "$(getprop sys.boot_completed)" != 1 ]; do
#     sleep 1
# done

# ensure boot has actually completed