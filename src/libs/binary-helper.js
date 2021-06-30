
/**
 * 二进制工具类
 */
 function BinaryHelper() {
}

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
    if(bytes instanceof ArrayBuffer) {
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

