function addClickListener(id, listener) {
  document.getElementById(id).addEventListener('click', listener);
}

const serviceUUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const readCharacteristicUUID = '0000fff1-0000-1000-8000-00805f9b34fb';
const writeCharacteristicUUID = '0000fff2-0000-1000-8000-00805f9b34fb';
const readDescriptorUUID = '00002902-0000-1000-8000-00805f9b34fb';

var client;

// acceptAllDevices: true,
addClickListener('connect', () => {
  if (client && client.isConnected()) {
    console.log('已经连接上设备');
    return;
  }

  console.log('开始扫描...');
  // 扫描设备
  startScan({
    filters: [{
      namePrefix: 'Bluetooth BP'
    }],
    optionalServices: [serviceUUID]
  }, (device, err) => {
    if (err) {
      console.error(err);
    } else {
      console.log(device);
      client = new BpBluetoothDeviceClient(device);
      // 连接设备
      setTimeout(() => client.connect(), 1000);
    }
  });
});

addClickListener('disconnect', () => {
  if (client && client.isConnected()) {
    // 断开连接
    client.disconnect();
  } else {
    console.log('未连接设备...');
  }
});


// acceptAllDevices: true,
addClickListener('startMeasure', () => {
  // 开始测量
  if (client && client.isConnected()) {
    client.sendStartCmd();
  } else {
    console.log('设备未连接');
  }
});

/**
 * 血压计客户端
 */
class BpBluetoothDeviceClient extends BluetoothDeviceClient {

  /**
   * 最近一次血压数据的时间，30秒内的视为同一条
   */
  lastBpTime = null;

  constructor(device) {
    super(device);
  }

  /**
   * 设备连接成功
   * 
   * @param {*} device 
   * @param {*} server 
   */
  onConnectSuccess(device, server) {
    console.log('连接设备成功: ' + device.id + ', ' + device.name);
    console.log(device);
    console.log(server);

    // 设置监听
    this.getServiceCharacteristic(serviceUUID, readCharacteristicUUID)
      .then(characteristic => this.addCharacteristicChanged(characteristic, this.onCharacteristicChanged))
      .catch(err => {
        console.error(err);
        // 连接失败了，重新连接吧
        this.disconnect();
        setTimeout(() => this.connect(), 1000);
      });
  }

  // 设备连接失败了
  onConnectFailure(device, err) {
    console.log('连接设备失败: ' + device.id + ', ' + device.name);
    console.log(device);
    console.error(err);
  }

  // 设备连接被断开
  onDisconnect(device) {
    console.log('设备连接断开: ' + device.id + ', ' + device.name);
    console.log(device);
  }

  onCharacteristicChanged(event, error) {
    if (error) {
      console.log('读取出现错误...');
      console.error(error);
      return;
    }
    let value = event.target.value;
    // console.log(value);
    let data = new Uint8Array(value.buffer, 0, value.buffer.byteLength);
    console.log('data: ' + this.bytesToHex(data) + ', length: ' + data.length);


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
      if (this.lastBpTime && (Date.now() - this.lastBpTime <= 30000)) {
        // 测量的数据应该至少间隔30秒，否则视为同一条数据
        return;
      }
      this.lastBpTime = Date.now();

      // 数据
      let systolic = data[4] & 0xFF;
      let diastolic = data[5] & 0xFF;
      let hr = data[6] & 0xFF;
      console.log('收缩压: ' + systolic + ', 舒张压: ' + diastolic + ', hr: ' + hr);
    }
  }

  getCmd(flag) {
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

  /**
   * 发送开始测量的指令
   */
  sendStartCmd() {
    let cmd = this.getCmd(0x05);
    console.log('cmd ==>: ' + this.bytesToHex(cmd));
    this.write(serviceUUID, writeCharacteristicUUID, cmd);
  }

}