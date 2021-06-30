// 引入BinaryHelper
if (!BinaryHelper) {
    require('./binary-helper');
}

/**
 * 开始扫描设备
 * 
 * @param {*} options 可选项
 * 
 * {
        filters: [
            { namePrefix: 'HSRG' }, 
            {namePrefix: 'Bluetooth BP'}
        ],
        optionalServices: [serviceUUID]
    }
 */
function startScan(options, callback) {
    navigator.bluetooth.requestDevice(options)
        .then(device => callback(device, null))
        .catch(err => callback(null, err));
}

/**
 * 蓝牙设备连接客户端
 */
function BluetoothDeviceClient(device, autoConnected) {
    BinaryHelper.call(this);
    if (!(device instanceof BluetoothDevice)) {
        throw new Error("蓝牙设备类型错误");
    }
    // 蓝牙设备
    this.device = device;
    // 是否自动连接
    this.autoConnected = autoConnected;
}
/**
 * 连接的设备
 */
BluetoothDeviceClient.prototype.device = null;
/**
 * 连接服务
 */
BluetoothDeviceClient.prototype.gattServer = null;
/**
 * 是否断开后自动重连设备
 */
BluetoothDeviceClient.prototype.autoConnect = false;
/**
 * 自动重连的间隔
 */
BluetoothDeviceClient.prototype.autoConnectDelay = 10000;
/**
 * 是否尝试连接中
 */
BluetoothDeviceClient.prototype._tryConnecting = false;
/**
 * 是否已经关闭
 */
BluetoothDeviceClient.prototype._disconnectState = false;

/**
 * 是否连接到设备
 * 
 * @returns 返回是否连接的状态
 */
BluetoothDeviceClient.prototype.isConnected = function () {
    return this.gattServer && this.gattServer.connected;
}

/**
 * 检查是否设备连接状态
 */
BluetoothDeviceClient.prototype.checkGattServer = function () {
    return new Promise((resolve, reject) => {
        if (!this.isConnected()) {
            reject("未连接设备");
        } else {
            resolve("SUCCESS");
        }
    });
}

/**
 * 获取服务
 * 
 * @param {BluetoothRemoteGATTServer} gattServer 
 * @param {string} serviceUUID 
 * @returns 返回BluetoothRemoteGATTService对象 
 */
BluetoothDeviceClient.prototype.getService = function (serviceUUID) {
    return this.checkGattServer().then(msg => this.gattServer.getPrimaryService(serviceUUID));
}

/**
 * 查找服务的特征
 * 
 * @param {BluetoothRemoteGATTServer} gattServer GATT服务 
 * @param {string} serviceUUID 服务UUID
 * @param {string} characteristicUUID 特征UUID 
 * @returns 返回 BluetoothRemoteGATTCharacteristic 对象
 */
BluetoothDeviceClient.prototype.getServiceCharacteristic = function (serviceUUID, characteristicUUID) {
    return this.getService(serviceUUID)
        .then(service => service.getCharacteristics())
        .then(characteristics => characteristics.find(c => c.uuid == characteristicUUID));
}

/**
 * 设置数据监听
 * 
 * @param {BluetoothRemoteGATTCharacteristic} characteristics 特征
 * @param {Function} listener 监听
 */
BluetoothDeviceClient.prototype.addCharacteristicChanged = function (characteristics, listener) {
    if (characteristics instanceof BluetoothRemoteGATTCharacteristic) {
        characteristics.addEventListener('characteristicvaluechanged', listener);
        characteristics.startNotifications();
        return new Promise(function (resolve, reject) {
            resolve('添加监听成功');
        });
    } else {
        return new Promise(function (resolve, reject) {
            reject('无法识别的characteristics: ' + characteristics + ', 必须是BluetoothRemoteGATTCharacteristics对象');
        });
    }
}

/**
 * 连接到设备成功
 * 
 * @param {BluetoothDevice} device 设备
 * @param {BluetoothRemoteGATTServer} server 连接服务
 */
BluetoothDeviceClient.prototype.onConnectSuccess = function (device, server) {
    console.log('连接设备成功: ' + device.id + ', ' + device.name);
    console.log(device);
    console.log(server);
}

/**
 * 连接设备失败
 * 
 * @param {BluetoothDevice} device 设备
 * @param {Error} err 错误 
 */
BluetoothDeviceClient.prototype.onConnectFailure = function (device, err) {
    console.log('连接设备失败: ' + device.id + ', ' + device.name);
    console.log(device);
    console.error(err);
}

/**
 * 设备断开连接
 * 
 * @param {BluetoothDevice} device 设备
 */
BluetoothDeviceClient.prototype.onDisconnect = function (device) {
    console.log('设备连接断开: ' + device.id + ', ' + device.name);
    console.log(device);
}

/**
 * 连接设备
 * 
 * @returns 是否尝试连接中
 */
BluetoothDeviceClient.prototype.connect = function () {
    if (this.isConnected()) {
        // 已经连接上设备了
        return true;
    }

    if (this._tryConnecting) {
        throw new Error('正在尝试连接中，请稍等！');
    }

    this._tryConnecting = true;
    this._disconnectState = false;

    // 设置断开时的监听
    if (!this.device.ongattserverdisconnected) {
        // 监听设备断开
        this.device.ongattserverdisconnected = (event) => {
            this.gattServer = null;
            this._disconnectState = false;
            this._tryConnecting = false;
            this.onDisconnect(event.target);
        };
    }

    // 连接
    this.device.gatt.connect()
        .then(server => {
            this._tryConnecting = false;
            if (this._disconnectState) {
                // 已经关闭，直接断开
                server.disconnect();
                return;
            }
            if (!server.connected) {
                server.disconnect();
                this.onConnectFailure(server.device, server, new Error("连接失败"));
                return;
            }
            this.gattServer = server;
            this.onConnectSuccess(this.device, server);
        })
        .catch(err => {
            this._tryConnecting = false;
            if (this._disconnectState) {
                // 已经关闭，直接断开
                server.disconnect();
                return;
            }
            this.onConnectFailure(server.device, err);
        });
    return true;
}

/**
 * 断开连接
 */
BluetoothDeviceClient.prototype.disconnect = function () {
    this._disconnectState = true;
    if (this.isConnected()) {
        this.gattServer.disconnect();
    }
}

/**
 * 发送数据
 * 
 * @param {string} serviceUUID 
 * @param {string} characteristicUUID 
 * @param {number[]|ArrayBuffer} data 
 */
BluetoothDeviceClient.prototype.write = function (serviceUUID, characteristicUUID, data) {
    return new Promise((resolve, reject) => {
        this.getServiceCharacteristic(serviceUUID, characteristicUUID)
            .then(characteristics => resolve(characteristics.writeValue(data)))
            .catch(err => reject(err));
    });
}




// ~