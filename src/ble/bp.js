const serviceUUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const readCharacteristicUUID = '0000fff1-0000-1000-8000-00805f9b34fb';
const writeCharacteristicUUID = '0000fff2-0000-1000-8000-00805f9b34fb';
const readDescriptorUUID = '00002902-0000-1000-8000-00805f9b34fb';

// require('../libs/SerialPortDevice')

const binaryHelper = new BinaryHelper();

// 开始测量
function getCmd(flag) {
  // 0xFD,0xFD,0xFA,0x05,YEAR,MONTH,DAY,HOUR,MINUTE,SECOND,0X0D, 0x0A
  let time = new Date();
  let cmd = new Uint8Array(12);
  cmd[0] = 0xFD;
  cmd[1] = 0xFD;
  cmd[2] = 0xFA;
  cmd[3] = flag;
  cmd[4] = (time.getFullYear() % 2000) & 0xFF; // year
  cmd[5] = ((time.getMonth() + 1) & 0xFF); // month
  cmd[6] = (time.getDay() & 0xFF); // day
  cmd[7] = (time.getHours() & 0xFF); // hour
  cmd[8] = (time.getMinutes() & 0xFF); // minute
  cmd[9] = (time.getSeconds() & 0xFF); // second
  cmd[10] = 0X0D;
  cmd[11] = 0x0A;
  return cmd;
}

var gattServer = null;
var lastBpTime = null; // 最近一次血压数据的时间

// acceptAllDevices: true,
document.getElementById('connect')
  .addEventListener('click', () => {
    if(gattServer && gattServer.connected) {
      console.log('已经连接上设备');
      return;
    }

    console.log('开始扫描...');
    //optionalServices
    navigator.bluetooth.requestDevice({
        filters: [{
          namePrefix: 'HSRG'
        }, {
          namePrefix: 'Bluetooth BP'
        }],
        optionalServices: [serviceUUID]
      })
      .then(device => onDeviceScan(device))
      .catch(err => console.error(err));
  });

document.getElementById('disconnect')
  .addEventListener('click', () => {
    if (gattServer) {
      // 断开连接
      gattServer.disconnect();
      gattServer = null;
      console.log('断开连接...');
    } else {
      console.log('未连接设备...');
    }
  });

// acceptAllDevices: true,
document.getElementById('startMeasure')
  .addEventListener('click', () => {
    // 开始测量
    if (gattServer && gattServer.connected) {
      sendStartCmd(gattServer);
    } else {
      console.log('设备未连接');
    }
  });

/**
 * 扫描到设备
 * 
 * @param {BluetoothDevice} device 
 */
function onDeviceScan(device) {
  // 连接
  device.gatt.connect()
    .then((server) => {
      if (!server.connected) {
        console.log('连接失败!');
        onConnectFailure(server.device, server, new Error("连接失败"));
        server.disconnect();
        return;
      }

      // 获取服务
      getService(server, serviceUUID)
        // 连接成功
        .then(service => {
          gattServer = server;
          onConnectSuccess(server.device, server, service);
        })
        .catch(err => {
          gattServer = null;
          onConnectFailure(server.device, server, err);
        });
    })
    .catch(err => onConnectFailure(server.device, server, err));
}

/**
 * 连接到设备成功
 * 
 * @param {BluetoothDevice} device 设备
 * @param {BluetoothRemoteGATTServer} server 连接服务
 * @param {BluetoothRemoteGATTService } service UUID的服务
 */
function onConnectSuccess(device, server, service) {
  console.log('连接到设备: ' + device.id + ', ' + device.name);
  console.log(device);
  console.log(server);
  console.log(service);

  getReadCharacteristic(server)
    .then(characteristics => addCharacteristicListener(characteristics, onCharacteristicReadChanged))
    .catch(err => console.error(err));

  setTimeout(() => {
    console.log('开始测量...');

    // 发送开始测量的指令
    sendStartCmd(gattServer);

  }, 1000);

}

/**
 * 连接到设备失败
 * 
 * @param {BluetoothDevice} device 设备
 * @param {BluetoothRemoteGATTServer} server 服务，可能为空
 * @param {Error} err 错误 
 */
function onConnectFailure(device, server, err) {
  console.log('连接到设备失败: ' + device.id + ', ' + device.name);
  console.log(device);
  console.log(server);
  console.error(err);
}

/**
 * 可读取
 * 
 * @param {*} event 事件
 * @param {*} error 错误
 */
function onCharacteristicReadChanged(event, error) {
  // console.log('onCharacteristicReadChanged...')
  if (error) {
    console.log('读取出现错误...');
    console.error(error);
    return;
  }
  let value = event.target.value;
  // console.log(value);
  let data = new Uint8Array(value.buffer, 0, value.buffer.byteLength);
  console.log('data: ' + binaryHelper.bytesToHex(data) + ', length: ' + data.length);

  // 解析数据
  let type = data[2];
  if (type == 0x06) {
    console.log('开始测量....');
  } else if (0xFB == type) {
    let pressure = ((data[3] & 0xFF) << 8) | (data[4] & 0xFF);
    console.log('压力值: ' + pressure);
  } else if (0xFD == type) {
    // 测量错误
    console.log('测量错误');
  } else if (0xFE == type) {
    if(lastBpTime && (Date.now() - lastBpTime <= 30000)) {
      // 测量的数据应该至少间隔30秒，否则视为同一条数据
      return;
    }
    lastBpTime = Date.now();

    // 数据
    let systolic = data[4] & 0xFF;
    let diastolic = data[5] & 0xFF;
    let hr = data[6] & 0xFF;
    console.log('收缩压: ' + systolic + ', 舒张压: ' + diastolic + ', hr: ' + hr);
  }

}

/**
 * 发送开始测量的指令
 */
function sendStartCmd(server) {
  getWriteCharacteristic(server)
    .then(characteristics => {
      let cmd = getCmd(0x05);
      characteristics.writeValue(cmd);
      console.log('cmd ==>: ' + binaryHelper.bytesToHex(cmd));
    })
    .catch(err => console.error(err));
}

/**
 * 获取服务
 * 
 * @param {BluetoothRemoteGATTServer} gattServer 
 * @param {string} serviceUUID 
 * @returns 返回BluetoothRemoteGATTService对象 
 */
function getService(gattServer, serviceUUID) {
  return gattServer.getPrimaryService(serviceUUID);
}

/**
 * 查找服务的读取特征
 * 
 * @param {BluetoothRemoteGATTServer} gattServer GATT服务 
 * @returns 返回读取的BluetoothRemoteGATTCharacteristic对象
 */
function getReadCharacteristic(gattServer) {
  return getServiceCharacteristic(gattServer, serviceUUID, readCharacteristicUUID);
}

/**
 * 查找服务的写入特征
 * 
 * @param {BluetoothRemoteGATTServer} gattServer GATT服务 
 * @returns 返回写入的BluetoothRemoteGATTCharacteristic对象
 */
function getWriteCharacteristic(gattServer) {
  return getServiceCharacteristic(gattServer, serviceUUID, writeCharacteristicUUID);
}

/**
 * 查找服务的特征
 * 
 * @param {BluetoothRemoteGATTServer} gattServer GATT服务 
 * @param {string} serviceUUID 服务UUID
 * @param {string} characteristicUUID 特征UUID 
 * @returns 返回BluetoothRemoteGATTCharacteristic对象
 */
function getServiceCharacteristic(gattServer, serviceUUID, characteristicUUID) {
  return gattServer.getPrimaryService(serviceUUID)
    .then(service => service.getCharacteristics())
    .then(characteristics => characteristics.find(c => c.uuid == characteristicUUID));
}

/**
 * 添加数据监听
 * 
 * @param {BluetoothRemoteGATTCharacteristics} characteristics 特征
 * @param {Function} listener 监听
 */
function addCharacteristicListener(characteristics, listener) {
  characteristics.addEventListener('characteristicvaluechanged', listener);
  characteristics.startNotifications();
}