import {exec, fullScreen, toast} from 'kernelsu';

const certLowSystem = "/system/etc/security/cacerts/";
const certHightSystem = "/apex/com.android.conscrypt/cacerts/";
const certUserSystem = "/data/misc/user/0/cacerts-added/";
const certCustom = "/data/local/tmp/cert/"
const certModule = "/data/adb/modules/MoveCertificate/certificates"

/**
 * 指定目录下的文件列表
 * @param path 目录路径
 * @returns {Promise<string[]|*[]>}
 */
async function getFileList(path) {
    const {errno, stdout, stderr} = await exec('ls ' + path);
    if (errno === 0) {
        try{
            return stdout.toString().trim().split('\n');
        }catch (e) {
            toast(`获取 path:${path} 文件列表失败:${stderr}`)
            return [];
        }

    }
}

async function readFile(path){
    const {errno, stdout, stderr} = await exec('cat ' + path);
    if (errno === 0) {
        // const encoder = new TextEncoder();
        // return encoder.encode(stdout).buffer;
        return stdout;
    }else {
        toast(`读取 path:${path} 失败:${stderr}`)
        return "";
    }

    // return await promises.readFile(path);
}

/**
 * 获取证书名称
 * @param path
 * @returns {Promise<string>}
 */
async function getCertName(path){

    let certNames = ["Fiddler Root Certificate","PortSwigger","Charles Proxy CA","Reqable CA","mitmproxy"]

    try {
        let certText = await readFile(path);
        for (const item of certNames) {
            if (certText.includes(item)){
                return item;
            }
        }
        return "Unknown"

    } catch (err) {
        toast(`失败:${err}`);// 读取证书名称 ${name}
        return "";
    }
}

async function deleteCert(file){
    const {errno, stdout, stderr} = await exec('getprop ro.build.version.release');
    const systemVersion = Number(stdout)
    if (systemVersion === Number.NaN){
        toast(`获取系统版本失败:${stderr}`)
    }

    if (systemVersion >= 14){
        // 14及以上版本
        await exec(`rm -f ${certHightSystem+file}`);
    }else {
        // 14以下版本
        await exec(`rm -f ${certLowSystem+file}`);
    }
    await exec(`rm -f ${certCustom+file}`)
    await exec(`rm -f ${certModule+file}`)
    await exec(`rm -f ${certUserSystem+file}`)

}

/**
 * 获取版本信息
 * @returns {Promise<string[]>}
 */
async function getVersionInfo() {
    const {errno, stdout, stderr} = await exec('cat /data/adb/modules/MoveCertificate/module.prop');
    if (errno === 0) {
        // return `version: ${stdout.split('version=')[1].split('\n')[0]}`;
        return stdout.toString().trim().split('\n');
    } else {
        return [`Error executing command: ${stderr}`];
    }

}

async function getLoggerInfo() {
    const {errno, stdout, stderr} = await exec('cat /data/adb/modules/MoveCertificate/install.log');
    if (errno === 0) {
        return stdout.toString().trim().split('\n');
    } else {
        return [`Error executing command: ${stderr}`];
    }
}

/**
 * 获取已安装证书列表
 * @returns {Promise<[{name: string, status: string},{name: string, status: string}]|*[]>}
 */
async function getInstallCertResults() {

    const certLowSystem = "/system/etc/security/cacerts/";
    const certUserSystem = "/data/misc/user/0/cacerts-added/";
    // var certCustom = "/data/local/tmp/cert/"
    const certHightSystem = "/apex/com.android.conscrypt/cacerts/";
    // var certFindSystem = ""

    // 1. 获取当前系统版本
    const {errno, stdout, stderr} = await exec('getprop ro.build.version.release');
    const systemVersion = Number(stdout)
    if (systemVersion === Number.NaN){
        toast(`获取系统版本失败:${stderr}`)
        return [];
    }

    // 2. 获取用户证书列表
    const userCerts = await getFileList(certUserSystem);

    // 3. 获取系统证书列表
    let systemCerts = [];
    if (systemVersion >= 14) {
        systemCerts = await getFileList(certHightSystem);
    } else {
        systemCerts = await getFileList(certLowSystem);
    }
    if (!userCerts.length && !systemCerts.length){
        toast(`未安装证书:userCerts->${userCerts.length},systemCerts->${systemCerts.length}`)
        return [];
    }

    // 4. 获取证书状态 名称
    let results = [];
    for (const item of userCerts) {
        let name = await getCertName(certUserSystem+item);
        if(systemCerts.includes(item)){
            results[item] = "success";
            results.push({status: 'success', name: `${item}: ${name}`})
        }else{
            results.push({status: 'failed', name: `${item}: ${name}`})
        }
    }

    return results;

}

/**
 * 主动调用 显示版本信息
 * @returns {Promise<void>}
 */
async function displayInfo() {
    let versionInfos = await getVersionInfo();
    document.getElementById('versionInfo').innerHTML = versionInfos.join('<br>');
    let loggerInfos = await getLoggerInfo();
    document.getElementById('logger').innerHTML = loggerInfos.join('<br>');
}

/**
 * 主动调用 显示证书列表
 * @returns {Promise<void>}
 */
async function displayResults() {
    const results = getInstallCertResults();
    const list = document.getElementById('certificateList');
    let deleteTarget = null;

    // 获取模态对话框及其元素
    const modal = document.getElementById('deleteModal');
    const confirmDeleteButton = document.getElementById('confirmDelete');
    const cancelDeleteButton = document.getElementById('cancelDelete');

    const showModal = (target) => {
        deleteTarget = target;
        modal.style.display = 'block';
    };

    const hideModal = () => {
        modal.style.display = 'none';
        deleteTarget = null;
    };

    confirmDeleteButton.onclick = () => {
        if (deleteTarget) {
            list.removeChild(deleteTarget);
            deleteCert(deleteTarget.textContent.split(':')[0]);
            toast(`${deleteTarget.textContent.split(':')[0]} 已删除,重启生效!`)
        }
        hideModal();
    };

    cancelDeleteButton.onclick = hideModal;

    window.onclick = (event) => {
        if (event.target === modal) {
            hideModal();
        }
    };

    results.then(results => results.forEach(result => {
        const li = document.createElement('li');

        const statusDot = document.createElement('div');
        statusDot.className = `status-dot ${result.status === 'success' ? 'green' : 'gray'}`;
        li.appendChild(statusDot);

        const certName = document.createElement('span');
        certName.textContent = result.name;
        li.appendChild(certName);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '删除';
        deleteButton.className = 'delete-button';
        deleteButton.onclick = () => showModal(li);
        li.appendChild(deleteButton);

        li.oncontextmenu = (e) => {
            e.preventDefault();
            deleteButton.style.display = 'block';
        }

        li.onmouseleave = () => {
            deleteButton.style.display = 'none';
        }

        list.appendChild(li);
    }));
}

// 显示 MoveCertificate
function displayHelloWorld() {
    toast("MoveCertificate!");
    fullScreen(false);
}

/**
 * 页面加载完成 自动触发调用
 */
window.onload = function () {
    displayInfo().then(r => null);
    displayResults().then(r => null);
    displayHelloWorld();
};
