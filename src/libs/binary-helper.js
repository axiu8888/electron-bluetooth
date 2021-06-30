/**
 * 二进制工具类
 */
function BinaryHelper() {}

/**
 * 将字符串转换为字节数组
 *
 * @param {String} str 字节数据
 * @param {Number} maxLength 最大长度
 */
BinaryHelper.prototype.strToBytes = function (str, maxLength) {
    if (maxLength && str.length > maxLength) {
        throw new Error("超过最大长度");
    }
    let bytes = [];
    for (let i = 0; i < str.length; i++) {
        let char = str.charCodeAt(i);
        let st = [];
        do {
            st.push(char & 0xff);
            char = char >> 8;
        } while (char);
        // 拼接数组
        st.reverse().forEach((v) => bytes.push(v));
    }
    return bytes;
};

/**
 * 将二进制字符串转换成Unicode字符串
 * 
 * @param {number[]|Buffer|Array} bytes 字节数组
 */
BinaryHelper.prototype.bytesToStr = function (bytes) {
    var array = [];
    for (let i = 0; i < bytes.length; i++) {
        array.push(String.fromCharCode(parseInt(bytes[i])));
    }
    return array.join("");
}

/**
 * 16进制字符串转换为二进制数组
 *
 * @param {String} hex 16进制字符串
 */
BinaryHelper.prototype.hexToBytes = function (hex) {
    if (hex.length % 2 != 0) {
        throw new Error("不是16进制数据");
    }

    let len = (hex.length /= 2);
    var array = new Array();
    var pos = 0;
    for (let i = 0; i < len; i++) {
        array.push(parseInt(hex.substr(pos, 2), 16));
        pos += 2;
    }
    return array;
};

/**
 * 字节数组转换为16进制
 *
 * @param {Array|Buffer} bytes 字节数组
 * @param {boolean} trim 是否清楚空格
 */
BinaryHelper.prototype.bytesToHex = function (bytes, trim) {
    if (bytes instanceof ArrayBuffer) {
        bytes = new Uint8Array(bytes, 0, bytes.byteLength);
    }
    var array = [];
    let tmp;
    for (let i = 0; i < bytes.length; i++) {
        tmp = bytes[i].toString(16);
        if (tmp.length == 1) {
            array.push("0");
        }
        tmp = tmp.toUpperCase();
        if (!(trim && tmp === 'FF')) {
            array.push(tmp);
        }
    }
    return array.join("");
};

/**
 * 往数组中push整数数据
 *
 * @param {Array} bytes 原字节数组
 * @param {Number|String|Array} payload  push的数据
 */
BinaryHelper.prototype.pushBytes = function (bytes, payload) {
    if (payload instanceof Number) {
        bytes.push(payload);
    } else if (payload instanceof String) {
        bytes.push(parseInt(payload));
    } else if (payload.length) {
        payload.forEach((v) => this.pushBytes(bytes, v));
    } else {
        if (typeof payload === 'number') {
            bytes.push(payload);
        } else if (typeof payload === 'string') {
            bytes.push(parseInt(payload));
        } else {
            throw new Error("不支持的类型数据: " + JSON.stringify(payload));
        }
    }
};

/**
 * 将IP和端口转换为字节数组
 *
 * @param {String} ip IP地址
 * @param {number} port 端口
 * @param {boolean} bigEndian 端口是否为大端存储，默认为小端存储
 */
BinaryHelper.prototype.hostToBytes = function (ip, port, bigEndian) {
    let array = [];
    let splits = (ip + "").split(".");
    splits.forEach((v) => array.push(parseInt(v) & 0xFF));
    if (port) {
        if (bigEndian) {
            // 大端存储
            array.push((port >> 8) & 0xff); // 端口高位
            array.push(port & 0xff); // 端口低位
        } else {
            // 小端存储
            array.push(port & 0xff); // 端口低位
            array.push((port >> 8) & 0xff); // 端口高位
        }
    }
    return array;
};

/**
 * 数值转换成字节数组
 * 
 * @param num 数值
 * @param bit  位长度: 8/16/32/64
 * @param bigEndian 是否为大端
 */
BinaryHelper.prototype.numberToBytes = function (num, bit, bigEndian = true) {
    let size = Math.floor(bit / 8);
    let bytes = [];
    for (let i = 0; i < size; i += 1) {
        // 大端存储：高位在前，低位在后  数值先高字节位移，后低字节
        // 小端存储：低位在前，高位在后  数值先取低字节，后高字节依次右移
        bytes.push(((bigEndian ? (num >> ((bit - 8) - i * 8)) : (num >> (i * 8))) & 0xFF));
    }
    return bytes;
}

/**
 * 字节数组转换成整数
 *
 * @param bytes  字节数组
 * @param order  字节序
 * @param signed 是否为有符号整数
 * @param upperCase 是否为大写字母
 * @return 返回一个整数
 */
BinaryHelper.prototype.bytesToNumber = function (bytes, bigEndian = true, signed = false) {
    // 大端存储：高位在前，低位在后
    // 小端存储：低位在前，高位在后
    let value = 0;
    // 正数的原码，高位为0，反码/补码均与原码相同；
    // 负数的原码：高位为1, 其他为正数的原码；反码是除符号位，其它按位取反；补码在反码的基础上 + 1
    if (bigEndian) {
        if (signed && ((bytes[0] & 0b10000000) >> 7) == 1) {
            for (let b of bytes) {
                value <<= 8;
                value |= ~b & 0xFF;
            }
            value = ((-value) - 1);
        } else {
            for (let b of bytes) {
                value <<= 8;
                value |= b & 0xFF;
            }
        }
    } else {
        if (signed && ((bytes[bytes.length - 1] & 0b10000000) >> 7) == 1) {
            for (let i = bytes.length - 1; i >= 0; i--) {
                value <<= 8;
                value |= ~bytes[i] & 0xFF;
            }
            value = ((-value) - 1);
        } else {
            for (let i = bytes.length - 1; i >= 0; i--) {
                value <<= 8;
                value |= bytes[i] & 0xFF;
            }
        }
    }
    return value;
}

/**
 * 整数转换成16进制字符串
 *
 * @param bytes  字节
 * @param bitSize  字节大小: 8/16/32/64
 * @param bigEndian 是否为大端存储
 * @param upperCase 是否为大写字母
 * @return 返回一个16进制字符串
 */
BinaryHelper.prototype.numberToHex = function (value, bitSize, bigEndian = true, upperCase = true) {
    let bytes = this.numberToBytes(value, bitSize, bigEndian);
    return this.bytesToHex(bytes, false, upperCase);
}

/**
 * 16进制字符串转换成整数
 *
 * @param hex  16进制字符串
 * @param order  字节序
 * @param signed 是否为有符号整数
 * @return 返回一个整数
 */
BinaryHelper.prototype.hexToNumber = function (hex, bigEndian = true, signed = false) {
    let bytes = this.hexToBytes(hex);
    return this.bytesToNumber(bytes, bigEndian, signed);
}