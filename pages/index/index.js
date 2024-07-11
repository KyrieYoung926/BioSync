Page({
  data: {
    dutyCycle: 0,
    status: "未连接",
    deviceId: null,
    serviceId: null,
    characteristicId: null,
    devices: [],
    departureLocation: '',
    departureLatitude: null,
    departureLongitude: null,
    arrivalLocation: '',
    arrivalLatitude: null,
    arrivalLongitude: null,
    departureTime: '12:00',
    arrivalTime: '14:00'
  },

  // 当起飞时间选择改变时的处理函数
  bindDepartureTimeChange: function(e) {
    this.setData({
      departureTime: e.detail.value
    });
    // 这里可以调用存储函数，将 departureTime 存储到服务器或本地存储中
    // 示例：this.saveDepartureTime(e.detail.value);
  },

  // 当到达时间选择改变时的处理函数
  bindArrivalTimeChange: function(e) {
    this.setData({
      arrivalTime: e.detail.value
    });
    // 这里可以调用存储函数，将 arrivalTime 存储到服务器或本地存储中
    // 示例：this.saveArrivalTime(e.detail.value);
  },

  // 示例存储函数，你可以根据实际情况调整
  saveDepartureTime: function(time) {
    // 将起飞时间保存到服务器或本地存储
    console.log('Saving departure time:', time);
    // 示例：使用 wx.request 发送到服务器保存
  },

  saveArrivalTime: function(time) {
    // 将到达时间保存到服务器或本地存储
    console.log('Saving arrival time:', time);
    // 示例：使用 wx.request 发送到服务器保存
  },

  // 选择出发地点
  chooseDepartureLocation: function () {
    wx.chooseLocation({
      success: (res) => {
        console.log(res);
        this.setData({
          departureLocation: res.name,
          departureLatitude: res.latitude,
          departureLongitude: res.longitude,
        });
      },
      fail: (err) => {
        console.error(err);
      },
    });
  },

  // 选择到达地点
  chooseArrivalLocation: function () {
    wx.chooseLocation({
      success: (res) => {
        console.log(res);
        this.setData({
          arrivalLocation: res.name,
          arrivalLatitude: res.latitude,
          arrivalLongitude: res.longitude,
        });
      },
      fail: (err) => {
        console.error(err);
      },
    });
  },

  
  connectBluetooth() {
    let that = this;
    wx.openBluetoothAdapter({
      success: (res) => {
        console.log('Bluetooth Adapter Initialized', res);
        that.setData({ status: '初始化成功' });
        wx.showToast({ title: '蓝牙初始化成功', icon: 'success', duration: 2000 });

        wx.startBluetoothDevicesDiscovery({
          success: (res) => {
            console.log('Bluetooth Devices Discovery Started', res);
            that.setData({ status: '开始搜索设备' });
            wx.showToast({ title: '开始搜索设备', icon: 'success', duration: 2000 });

            wx.onBluetoothDeviceFound((devices) => {
              console.log('Found devices:', devices);
              that.setData({ devices: devices.devices });

              let targetDevice = devices.devices.find(device => device.name === 'ESP32_PWM_Control');
              if (targetDevice) {
                that.setData({ status: '设备已找到，正在连接...' });
                console.log('Connecting to device:', targetDevice);
                wx.showToast({ title: '设备已找到', icon: 'success', duration: 2000 });

                that.createConnection(targetDevice.deviceId);
              }
            });
          },
          fail: (err) => {
            console.error('Discovery failed', err);
            that.setData({ status: '设备搜索失败' });
            wx.showToast({ title: '设备搜索失败', icon: 'none', duration: 2000 });
          }
        });
      },
      fail: (err) => {
        console.error('Bluetooth Adapter Initialization failed', err);
        that.setData({ status: '蓝牙初始化失败' });
        wx.showToast({ title: '蓝牙初始化失败', icon: 'none', duration: 2000 });
      }
    });
  },

  createConnection(deviceId) {
    let that = this;
    wx.createBLEConnection({
      deviceId: deviceId,
      success: (res) => {
        console.log('Connected to device:', res);
        that.setData({ status: "已连接", deviceId: deviceId });
        wx.showToast({ title: '设备已连接', icon: 'success', duration: 2000 });

        wx.getBLEDeviceServices({
          deviceId: deviceId,
          success: (res) => {
            console.log('Device services:', res);
            let service = res.services.find(s => s.uuid === '4FAFC201-1FB5-459E-8FCC-C5C9C331914B');
            if (service) {
              wx.getBLEDeviceCharacteristics({
                deviceId: deviceId,
                serviceId: service.uuid,
                success: (res) => {
                  console.log('Device characteristics:', res);
                  let characteristic = res.characteristics.find(c => c.uuid === 'BEB5483E-36E1-4688-B7F5-EA07361B26A8');
                  if (characteristic) {
                    that.setData({ serviceId: service.uuid, characteristicId: characteristic.uuid });
                    wx.showToast({ title: '特征已找到', icon: 'success', duration: 2000 });
                  } else {
                    console.error('Characteristic not found');
                    that.setData({ status: '特征未找到' });
                    wx.showToast({ title: '特征未找到', icon: 'none', duration: 2000 });
                  }
                },
                fail: (err) => {
                  console.error('Get characteristics failed', err);
                  that.setData({ status: '获取特征失败' });
                  wx.showToast({ title: '获取特征失败', icon: 'none', duration: 2000 });
                }
              });
            } else {
              console.error('Service not found');
              that.setData({ status: '服务未找到' });
              wx.showToast({ title: '服务未找到', icon: 'none', duration: 2000 });
            }
          },
          fail: (err) => {
            console.error('Get services failed', err);
            that.setData({ status: '获取服务失败' });
            wx.showToast({ title: '获取服务失败', icon: 'none', duration: 2000 });
          }
        });
      },
      fail: (err) => {
        console.error('Connection failed', err);
        that.setData({ status: "连接失败" });
        wx.showToast({ title: '连接失败', icon: 'none', duration: 2000 });
      }
    });
  },

  onSliderChange(e) {
    let dutyCycle = e.detail.value;
    this.setData({ dutyCycle: dutyCycle });
    if (this.data.deviceId && this.data.serviceId && this.data.characteristicId) {
      let buffer = this.stringToArrayBuffer(String(dutyCycle));
      console.log('Writing value to characteristic:', dutyCycle);
      wx.writeBLECharacteristicValue({
        deviceId: this.data.deviceId,
        serviceId: this.data.serviceId,
        characteristicId: this.data.characteristicId,
        value: buffer,
        success: (res) => {
          console.log('Write success', res);
          wx.showToast({ title: '设置成功', icon: 'success', duration: 2000 });
        },
        fail: (err) => {
          console.error('Write failed', err);
          wx.showToast({ title: '设置失败', icon: 'none', duration: 2000 });
        }
      });
    } else {
      console.error('Device, service, or characteristic not found');
      wx.showToast({ title: '未连接设备', icon: 'none', duration: 2000 });
    }
  },

  stringToArrayBuffer(str) {
    let buf = new ArrayBuffer(str.length);
    let bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  },

  disconnectBluetooth() {
    let that = this;
    if (this.data.deviceId) {
      wx.closeBLEConnection({
        deviceId: this.data.deviceId,
        success: (res) => {
          console.log('Disconnected from device', res);
          that.setData({ status: '已断开连接', deviceId: null, serviceId: null, characteristicId: null });
          wx.showToast({ title: '已断开连接', icon: 'success', duration: 2000 });
        },
        fail: (err) => {
          console.error('Disconnection failed', err);
          wx.showToast({ title: '断开连接失败', icon: 'none', duration: 2000 });
        }
      });
    }
  }
});
