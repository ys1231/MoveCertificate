#!/system/bin/sh
# Do NOT assume where your module will be located.
# ALWAYS use $MODDIR if you need to know where this script
# and module is placed.
# This will make sure your module will still work
# if Magisk change its mount point in the future
MODDIR=${0%/*}

# This script will be executed in late_start service mode
# At this point, the system has already started
sdk_version=$(getprop ro.build.version.sdk)
# debug
#sdk_version=34
sdk_version_number=$(expr "$sdk_version" + 0)

if [ "$sdk_version_number" -le 33 ]; then
    # Android version less than 14
    exit 0
fi
# wait for boot to complete
while [ "$(getprop sys.boot_completed)" != 1 ]; do
    sleep 1
done
# add logcat
LOG_PATH="$MODDIR/install14.log"
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

mount_cert /apex/com.android.conscrypt/cacerts/
# ensure boot has actually completed