#!/system/bin/sh
MODDIR=${0%/*}

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
## MOBULE DIR
MODULE_CERT_DIR=$MODDIR/certificates

## Custom certificate directory
CUSTOM_CERT_DIR=/data/local/tmp/cert

## User certificate directory
USER_CERT_DIR=/data/misc/user/0/cacerts-added

## System certificate directory
SYSTEM_CERT_DIR=/system/etc/security/cacerts

## Apex conscrypt directory
APEX_CONSCRYPT_DIR=/apex/com.android.conscrypt/cacerts

## Module built-in 
MODULE_SYSTEM_CERT_DIR=$MODDIR/system/etc/security/cacerts

## Module Apex conscrypt directory
MODULE_APEX_CONSCRYPT_DIR=$MODDIR/apex/com.android.conscrypt/cacerts

## Temporary directory
# FULL_PATH=$(mktemp -d)
# RANDOM_NAME=$(basename "$FULL_PATH")
TEMP_DIR=/mnt/instaler

move_custom_cert() {
    if [ "$(ls -A $CUSTOM_CERT_DIR)" ]; then
        cp -f $CUSTOM_CERT_DIR/* $MODULE_CERT_DIR
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
    chown root:root $1
    chown -R root:root $1
    chmod -R 644 $1
    chmod 755 $1
    chcon u:object_r:system_file:s0 $1/*
    touch -t 200901010800 $1/*
    touch -t 200901010800 $1
    print_log "fix permissions $1 status:$?"
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
    cert_dir=$MODULE_CERT_DIR
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