const serviceUUID = '0000ffb0-0000-1000-8000-00805f9b34fb';
const readCharacteristicUUID = '0000ffb2-0000-1000-8000-00805f9b34fb';
const writeCharacteristicUUID = '0000ffb2-0000-1000-8000-00805f9b34fb';


const binary = new BinaryHelper();

// 设备的客户端
var client;

function addClickListener(id, listener) {
    document.getElementById(id).addEventListener('click', listener);
}

// acceptAllDevices: true,
addClickListener('connect', () => {
    console.log('开始扫描...');
    // 扫描设备
    startScan({
        filters: [{
            namePrefix: 'PC-'
        }],
        optionalServices: [serviceUUID],
        // acceptAllDevices: true
    }, (device, err) => {
        if (err) {
            console.error(err);
        } else {
            console.log(device);

            if (device.name == 'PC-68B') {
                // if (device.name == 'HSRG_11000092') {
                client = new OximeterBluetoothDeviceClient(device);
                // 连接设备
                setTimeout(() => client.connect(), 1000);

                // console.log(binary.bytesToHex(client.crc8.table));

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

        let cmd = client.sendSpo2Enable();
        console.log('cmd =>: ' + binary.bytesToHex(cmd));

    } else {
        console.log('设备未连接');
    }
});

/**
 * 血氧仪
 */
class OximeterBluetoothDeviceClient extends BluetoothDeviceClient {

    constructor(device) {
        super(device);
        this.crc8 = new CRC8(CRC8.POLY.CRC8_CCITT);
        this.crc8.table = CRC8.CRC8_TABLE;
    }

    // 设备连接成功
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
        data = data.slice(4, data.length - 1);
        console.log('data: ' + binary.bytesToHex(data) + ', length: ' + data.length);


        // 
        if (data[0] == 0x01) {
            // 血氧参数数据采样频率：1Hz，固定每秒采集 1 次，即每 1 秒发送一包数据
            // Data0：数据类型固定为 0x01，表示该包为参数数据包。
            // Data1：血氧数据。范围为 0%~100%；0 代表无效值。
            if (!data[1]) {
                // 无效数据
                console.log('无效数据...');
                return;
            }
            // Data2~3：脉率数据。低字节在前，高字节在后；范围 0~511bpm。0 代表无效值。
            let pulseRate = binary.bytesToNumber([data[2], data[3]], false, true);
            console.log('pulseRate: ' + pulseRate);
            
            // Data4：PI（血流灌注指数）数据。范围 0%~25.5%；0 代表无效值。
            let PI = data[4] & 0xFF;
            console.log('PI: ' + PI);

            // Data5：血氧状态信息:
            // D0 – Probe disconnected （reserved）
            // D1 – Probe off（探头脱落、手指未插入）
            // D2 – Pulse searching
            // D3 – Check probe （探头故障或使用不当）
            // D4 – Motion detected （reserved）
            // D5 – Low perfusion （reserved）
            // D7D6 – 00 成人模式，01 新生儿模式，10 动物模式 (reserved)
            switch (data[5]) {
                case 0xD0:
                    console.log('Data5：血氧状态信息: Probe disconnected');
                    break;
                case 0xD1:
                    console.log('Data5：血氧状态信息: Probe disconnected');
                    break;
                case 0xD2:
                    console.log('Data5：血氧状态信息: Pulse searching');
                    break;
                case 0xD3:
                    console.log('Data5：血氧状态信息: Check probe （探头故障或使用不当）');
                    break;
                case 0xD4:
                    console.log('Data5：血氧状态信息: Motion detected');
                    break;
                case 0xD5:
                    console.log('Data5：血氧状态信息: Low perfusion');
                    break;
                case 0xD6:
                    console.log('Data5：血氧状态信息: ' + data[5]);
                    break;
                default:
                    console.log('Data5：血氧状态信息: ' + data[5]);
                    break;
            }


            // Data6：血氧状态信息
            // D0~D4：电池电量，范围 0~32（0~3.2Ｖ，精确到０.１）
            // D5： 1 上行主动发送波形允许状态，0 上行主动发送波形禁止状态（默认）
            // D6~D7：预留（默认置零）
            switch (data[5]) {
                case 0xD0:
                case 0xD1:
                case 0xD2:
                case 0xD3:
                case 0xD4:
                    console.log('电池电量，范围 0~32（0~3.2Ｖ，精确到０.１）');
                    break;
                case 0xD5:
                    console.log('1 上行主动发送波形允许状态，0 上行主动发送波形禁止状态（默认）');
                    break;
                default:
                    console.log('D6~D7：预留（默认置零）');
                    break;
            }


        }
    }

    cmd(data) {
        // 包头(2) + 令牌(1) + 长度(N + 1) + 内容(N) + CRC(1)
        let cmd = new Uint8Array(2 + 1 + 1 + data.length + 1);
        cmd[0] = 0xAA;
        cmd[1] = 0x55;
        cmd[2] = 0x0F;
        cmd[3] = 1 + data.length + 1;
        for (let i = 0; i < data.length; i++) {
            cmd[i + 4] = data[i];
        }
        // 计算校验和
        cmd[cmd.length - 1] = this.crc8.checksum(cmd.slice(0, cmd.length - 1));
        return cmd;
    }

    sendGetVersionCmd() {
        let cmd = this.cmd([0x83]);
        this.write(serviceUUID, writeCharacteristicUUID, cmd);
        return cmd;
    }

    /**
     * 血氧使能
     * 
     * @returns 发送的指令
     */
    sendSpo2Enable() {
        let cmd = new Uint8Array([0xAA, 0x55, 0x0F, 0x03, 0x84, 0x01, 0xE0]);
        this.write(serviceUUID, writeCharacteristicUUID, cmd);
        return cmd;
    }

    /**
     * 波形使能
     * 
     * @returns 发送的指令
     */
    sendWaveEnable() {
        let cmd = new Uint8Array([0xAA, 0x55, 0x0F, 0x03, 0x85, 0x01, 0x24]);
        this.write(serviceUUID, writeCharacteristicUUID, cmd);
        return cmd;
    }

}