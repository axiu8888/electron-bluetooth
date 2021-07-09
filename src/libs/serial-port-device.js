const SerialPort = require("serialport");
const Readline = SerialPort.parsers.Readline;

/**
 * 串口设备
 */
class SerialPortDevice extends BinaryHelper {
    /**
     * 串口对象
     */
    port = null;
    /**
     * 解析器
     */
    parser = null;
    /**
     * 串口
     *
     * @param {String} path 串口路径
     * @param {number} baudRate 波特率
     */
    constructor(path, baudRate) {
        super();
        // 串口对象
        this.port = new SerialPort(path, {
            baudRate: baudRate
        });
        this.parser = new Readline();
        // 设置解析
        this.port.pipe(this.parser);
        // 出现错误
        this.port.on('error', (err) => this.onError(err));
        // 结束
        this.port.on('end', () => this.onFinish());
        // 接收到数据
        this.parser.on('data', (msg, err) => this.onMessage(msg, err));
    }

    /**
     * 接收到数据
     * 
     * @param {string} msg 
     * @param {Error} err 
     */
    onMessage(msg, err) {
        console.log(msg);
        if (err) {
            console.error(err);
        }
    }

    /**
     * 出现错误
     * 
     * @param {Error} err 
     */
    onError(err) {
        console.error(err);
    }

    /**
     * 结束
     */
    onFinish() {
        console.log('onFinish');
    }

    /**
     * 判断端口是否是当前设备
     * 
     * @param {SerialPort} other 端口 
     * @returns 返回判断的结果
     */
    equals(other) {
        return other.path == this.port.path;
    }

    /**
     * 写入数据
     * 
     * @param {String|Buffer} msg 消息
     * @param {Function} callback 回调 
     */
    write(msg, callback) {
        this.port.write(msg, callback);
    }

}



/**
 * 状态
 */
const STATE = ["detach", "attach", "exist"];

/**
 * 串口设备探测类
 */
class SerialPortDetector {

    /**
     * 全部的串口设备
     */
    _devices = new Map();
    /**
     * 探测的timer
     */
    intervalTimer = null;
    /**
     * 间隔时间
     */
    interval = 5000;

    /**
     * 串口设备探测类
     *
     * @param {object} option 可选项
     */
    constructor(option) {
        option = option ? option : {};
        // 间隔时间
        this.interval = option.interval ? option.interval : 5000;
        // 过滤器
        this.filter = option.filter ? option.filter : this.filter;
    }

    /**
     * 过滤器
     */
    filter(port) {
        return true;
    };

    /**
     * 获取key
     */
    computeKey(port) {
        return typeof port == 'string' ? port : port.locationId;
    };

    /**
     * 获取串口设备数量
     *
     * @return 返回设备数量
     */
    size() {
        return this._devices.size;
    };

    /**
     * 判断串口设备是否存在
     *
     * @param {SerialPort} port 串口设备对象
     * @return 返回是否存在串口设备
     */
    has(port) {
        return this._devices.has(this.computeKey(port));
    };

    /**
     * 获取串口设备
     *
     * @param {SerialPort|String} key 串口设备对象或串口的
     * @return 返回串口设备
     */
    get(key) {
        return this._devices.get(this.computeKey(key));
    };

    /**
     * 保存串口设备
     *
     * @param {SerialPort} port 串口设备对象
     */
    put(port) {
        this._devices.set(this.computeKey(port), port);
        return port;
    };

    /**
     * 移除串口设备
     *
     * @param {SerialPort} port 串口设备对象
     */
    remove(port) {
        this._devices.delete(this.computeKey(port));
        return port;
    };

    /**
     * 清空串口设备
     */
    clear() {
        this._devices.clear();
    };

    /**
     * 迭代串口设备
     *
     * @param {callback} Function 回调
     */
    forEach(callback) {
        if (callback && this._devices.size) {
            this._devices.forEach(callback);
        }
    };

    /**
     * 探测
     */
    _detecting(_this) {
        SerialPort.list()
            .then((ports) => {
                _this.forEach((port) => _this.setState(port, 0));
                ports
                    .filter((p) => _this.filter(p))
                    .forEach((p) => {
                        let port = _this.get(p);
                        port = _this.setState(port ? port : p, port ? 2 : 1);
                        _this.put(port);
                    });
                _this.forEach((port) => {
                    if (_this.isExist(port)) {
                        _this.setState(port, 2);
                    } else if (_this.isAttach(port)) {
                        _this.attach(port);
                    } else {
                        _this.detach(port);
                    }
                });
            })
            .catch((err) => console.error(err));
    };

    /**
     * 加载串口设备
     */
    attach(port) {
        try {
            if (!this.has(port)) {
                this.put(port);
            }
            this.onAttach(port);
        } catch (err) {
            console.error(err);
        } finally {
            this.setState(port, 2);
        }
    };

    /**
     * 移除串口设备
     */
    detach(port) {
        this.setState(port, 0);
        this.remove(port);
        try {
            this.onDetach(port);
        } catch (err) {
            console.error(err);
        }
    };

    /**
     * 开始探测
     */
    start(clear) {
        if (!this.intervalTimer) {
            this.intervalTimer = setInterval(
                () => this._detecting(this),
                this.interval
            );
            if (clear) {
                this.clear();
            }
        }
    };

    /**
     * 停止探测
     */
    stop() {
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
            this.clear();
            this.intervalTimer = null;
        }
    };

    /**
     * 设置串口的状态
     *
     * @param {SerialPort} port 串口对象
     * @param {number} index 状态的索引
     * @return 返回当前的串口对象
     */
    setState(port, index) {
        port.state = STATE[index % STATE.length];
        return port;
    };

    /**
     * 判断串口的状态
     *
     * @param {SerialPort} port 串口对象
     * @param {number} index 状态的索引
     * @return 返回是否为当前要求的状态
     */
    isState(port, index) {
        return port.state == STATE[index];
    };

    /**
     * 是否为失去关联的设备
     *
     * @param {SerialPort} port 串口对象
     */
    isDetach(port) {
        return this.isState(port, 1);
    };

    /**
     * 是否为新关联的设备
     *
     * @param {SerialPort} port 串口对象
     */
    isAttach(port) {
        return this.isState(port, 1);
    };

    /**
     * 是否为已存在的设备
     *
     * @param {SerialPort} port 串口对象
     */
    isExist(port) {
        return this.isState(port, 2);
    };

    /**
     * 监听设备上线
     *
     * @param {SerialPort} port 串口对象
     */
    onAttach(port) {
        console.log("设备上线" + JSON.stringify(port));
    };

    /**
     * 监听设备离线
     *
     * @param {SerialPort} port 串口对象
     */
    onDetach(port) {
        console.log("设备离线" + JSON.stringify(port));
    };

}