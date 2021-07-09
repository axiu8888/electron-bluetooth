
const isDiastimeterDevice = (p) => p.vendorId == '1A86' && p.productId == '7523' && p.manufacturer == 'wch.cn';

/**
 * 测距设备
 */
class DiastimeterDevice extends SerialPortDevice {

    constructor(port) {
        super(port.path, 115200);
    }

    // onError(err) {
    // }

    onMessage(data, err) {
        console.log(data);
        if (err) {
            console.error(err);
        }
    }
}


// 串口
var device;

// 监听串口的插拔
let detector = new SerialPortDetector();
detector.onAttach = (port) => {
    // 匹配的串口
    if (isDiastimeterDevice(port)) {
        console.log(port);
        if(device) {
            return;
        }
        // 测距设备
        console.log('设备上线');
        device = new DiastimeterDevice(port);
        console.log(device);
    }
}
detector.onDetach = (port) => {
    if (isDiastimeterDevice(port)) {
        // 测距设备
        console.log(port);
        // 判断两个设备的路径是否相同，如果相同视为同一个设备
        if (this.device && this.device.equals(port)) {
            console.log("设备离线");
            this.device = null;
        }
    }
}
// 开始探测
detector.start();


// ~