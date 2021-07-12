var fs = require('fs');


const isDiastimeterPort = (p) => p.vendorId == '1A86' && p.productId == '7523' && p.manufacturer == 'wch.cn';

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

        if (typeof data == 'string') {
            if (data.startsWith('mc')) {
                // console.log('type: ' + (typeof data) + ', mc: ' + (data.startsWith('mc')));
                // console.log(data.split('/\s+/'));
                data = data.endsWith('\r') ? data.split('\r')[0] : data;
                let array = data.split(' ');
                // console.log(array);
                // array[0] // mc，固定的消息头
                // array[1] // mask，有那几位有效，如0x07表示有0,1,2的测距值有效
                // array[2] // range，标签到基站A0的距离，0000031f，31f的十进制是799，即0.799米
                // array[3] // 标签0
                // array[4] // 标签1
                // array[5] // 标签2
                // array[7] // 标签3
                // array[8] // 标签4  // 可能不存在
                // array[9] // 标签5  // 可能不存在
                // array[10] // 标签6  // 可能不存在
                // array[11] // 消息流水，不断积累增加，0474 
                // array[12] // range number，不断积累增加，ed 
                // array[13] // 测距时间戳，单片机内部时间，不准确
                // array[14] // rIDt:IDa，r为当前角色，a为基站，t为标签；IDt为标签地址，IDa为基站地址，如：a3:0
                // array[15] // 仅基站有，默认为当前基站与标签的dBm，显示信号强度；

                let realtime = {};
                let mask = parseInt(array[1], 16);
                realtime.mask = mask;
                if (mask & 0b00000001) {
                    realtime.range0 = parseInt(array[2], 16) / 1000.0;
                }
                if (mask & 0b00000010) {
                    realtime.range1 = parseInt(array[3], 16) / 1000.0;
                }
                if (mask & 0b00000100) {
                    realtime.range2 = parseInt(array[4], 16) / 1000.0;
                }
                if (mask & 0b00001000) {
                    realtime.range3 = parseInt(array[5], 16) / 1000.0;
                }
                if (mask & 0b00010000) {
                    realtime.range4 = parseInt(array[6], 16) / 1000.0;
                }
                if (mask & 0b00100000) {
                    realtime.range5 = parseInt(array[7], 16) / 1000.0;
                }
                if (mask & 0b01000000) {
                    realtime.range6 = parseInt(array[8], 16) / 1000.0;
                }

                let index = array[6].length == 8 ? 9 : 6;
                // 消息流水，不断积累增加，0474 
                realtime.range = parseInt(array[index], 16);
                // range number，不断积累增加
                realtime.rangeNumber = parseInt(array[index + 1], 16);
                // 测距时间戳，单片机内部时间，不准确
                realtime.timestamp = parseInt(array[index + 2], 16);
                // rIDt:IDa，r为当前角色，a为基站，t为标签；IDt为标签地址，IDa为基站地址，如：a3:0
                realtime.id = array[index + 3];
                // 仅基站有，默认为当前基站与标签的dBm，显示信号强度；
                if (realtime.id.startsWith('a')) {
                    realtime.dBm = parseInt(array[index + 4], 16) / 100.0;
                }
                console.log(JSON.stringify(realtime));

                fs.writeFile('D:/diastimeter.txt', JSON.stringify(realtime) + '\n', { 'flag': 'a' }, function (err) {
                    //如果err=null，表示文件使用成功，否则，表示希尔文件失败
                    if (err)
                        console.log('写文件出错了，错误是：' + err);
                    // else
                    //     console.log('ok');
                });


            } else if (data.startsWith('$T')) {
                // ~
            }

        }
    }
}


// 串口
var device;

// 监听串口的插拔
let detector = new SerialPortDetector();
// 探测间隔
detector.interval = 3000;
// 过滤器
detector.filter = (port) => isDiastimeterPort(port);
// 探测到串口USB插上
detector.onAttach = (port) => {
    // 匹配的串口
    console.log(port);
    if (device) {
        return;
    }
    // 测距设备
    console.log('设备上线');
    device = new DiastimeterDevice(port);
    console.log(device);
}
// 探测到串口USB拔掉
detector.onDetach = (port) => {
    // 测距设备
    console.log(port);
    // 判断两个设备的路径是否相同，如果相同视为同一个设备
    if (this.device && this.device.equals(port)) {
        console.log("设备离线");
        this.device = null;
    }
}
// 开始探测
detector.start();


// ~