#!/system/bin/sh
MODDIR=${0%/*}

# 使用 compatible 模式时，清理 builtin 模式遗留的挂载目录文件
# builtin 模式会把证书复制到模块挂载目录（system/、apex/），切回 compatible 后
# 这些文件不会被自动清理，会残留旧证书（甚至在 compatible 挂载失败时意外生效），
# 所以这里主动清空，保证当前生效的证书只来自 compatible 模式的挂载内容
clean_builtin_leftovers() {
    if [ "$CURRENT_MODE" != "builtin" ]; then
        rm -f "$MODULE_SYSTEM_CERT_DIR"/*
        rm -f "$MODULE_APEX_CONSCRYPT_DIR"/*
        rm -f "$MODULE_APEX_CONSCRYPT_NUM_DIR"/*
        print_log "cleaned builtin mode leftovers"
    fi
}

# 记录系统原始证书列表（system 与 apex），去重后保存，供后续比对使用
record_system_certs() {

    print_log "Record original system certificates"
    # 方便后续可能区分不同版本
    if [ "$sdk_version_number" -le 33 ]; then
        ls -1 $SYSTEM_CERT_DIR > $MODDIR/system_certs.txt 2>/dev/null
    else
        ls -1 $APEX_CONSCRYPT_DIR > $MODDIR/system_certs.txt 2>/dev/null
    fi

    sort -u $MODDIR/system_certs.txt -o $MODDIR/system_certs.txt
}