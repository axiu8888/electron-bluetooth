// 二进制工具类
const binaryHelper = new BinaryHelper();

// 设备的客户端
var client;
const serviceUUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const readCharacteristicUUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const writeCharacteristicUUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';


function addClickListener(id, listener) {
    document.getElementById(id).addEventListener('click', listener);
}


// acceptAllDevices: true,
addClickListener('connect', () => {
    console.log('开始扫描...');
    // 扫描设备
    startScan({
        filters: [{
            namePrefix: 'HSRG'
        }],
        optionalServices: [serviceUUID],
        // acceptAllDevices: true
    }, (device, err) => {
        if (err) {
            console.error(err);
        } else {
            console.log(device);

            if (device.name == 'HSRG_11000184') {
                client = newCollectorClient(device);
                // 连接设备
                setTimeout(() => client.connect(), 1000);
                return false;
            }
        }
        return true;
    });
});

addClickListener('disconnect', () => {
    if (client) {
        console.log('断开设备');
        client.disconnect();
    } else {
        console.log('设备未连接');
    }
});


addClickListener('startMeasure', () => {
    if (client && client.isConnected()) {
        // 发送指令
        // send()
    } else {
        console.log('设备未连接');
    }
});

/**
 * 创建采集器设备客户端
 * 
 * @param {BluetoothDevice} device 设备
 * @returns 返回创建的客户端
 */
function newCollectorClient(device) {
    let c = new BluetoothDeviceClient(device);
    // 设备连接成功
    c.onConnectSuccess = function (device, server) {
        console.log('连接设备成功: ' + device.id + ', ' + device.name);
        console.log(device);
        console.log(server);

        // 设置监听
        this.getServiceCharacteristic(serviceUUID, readCharacteristicUUID)
            .then(characteristic => this.addCharacteristicChanged(characteristic, onCharacteristicChanged))
            .catch(err => {
                console.error(err);
                // 连接失败了，重新连接吧
                this.disconnect();
                setTimeout(() => this.connect(), 1000);
            });
    }

    // 设备连接失败了
    c.onConnectFailure = function (device, err) {
        console.log('连接设备失败: ' + device.id + ', ' + device.name);
        console.log(device);
        console.error(err);
    }

    // 设备连接被断开
    c.onDisconnect = function (device) {
        console.log('设备连接断开: ' + device.id + ', ' + device.name);
        console.log(device);
    }

    return c;
}


function onCharacteristicChanged(event, error) {
    if (error) {
        console.log('读取出现错误...');
        console.error(error);
        return;
    }
    let value = event.target.value;
    // console.log(value);
    let data = new Uint8Array(value.buffer, 0, value.buffer.byteLength);
    console.log('data: ' + binaryHelper.bytesToHex(data) + ', length: ' + data.length);
}