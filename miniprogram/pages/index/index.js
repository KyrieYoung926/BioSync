const SunCalc = require('../../utils/suncalc.js'); // 引入suncalc库

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

    departureDate: '2024-07-11',
    arrivalDate: '2024-07-11',

    departureTime: '12:00',
    arrivalTime: '12:00',
    currentTime: '',
    destinationTime: '',

    planStartDate: '2024-07-11',
    planStartTime: '12:00',
    planDate: '1',
    dateRange: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'],
    planPercentage:'0',
    timeEquation:'0',


    departureSunrise: '',
    departureSunset: '',
    arrivalSunrise: '',
    arrivalSunset: '',
    departureDaylightPercentage: 0,
    arrivalDaylightPercentage: 0
  },

  // 当起飞日期选择改变时的处理函数
  bindDepartureDateChange: function(e) {
    this.setData({
      departureDate: e.detail.value
    });
    this.updateSunTimes();
  },

  // 当起飞时间选择改变时的处理函数
  bindPlanTimeChange: function(e) {
    this.setData({
      planTime: e.detail.value
    });
    this.updateSunTimes();
  },

  // 当到达日期选择改变时的处理函数
  bindArrivalDateChange: function(e) {
    this.setData({
      arrivalDate: e.detail.value
    });
    this.updateSunTimes();
  },

  // 当计划开始日期选择改变时的处理函数
  bindPlanDateChange: function (e) {
    var index = e.detail.value;
    var selectedValue = this.data.dateRange[index];
    this.setData({
      planDate: selectedValue,
    });
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
        this.updateSunTimes();
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
        this.updateSunTimes();
      },
      fail: (err) => {
        console.error(err);
      },
    });
  },

  // 更新日出日落时间
  updateSunTimes: function() {
    const departureDateTime = `${this.data.departureDate} ${this.data.departureTime}`;
    const arrivalDateTime = `${this.data.arrivalDate} ${this.data.arrivalTime}`;

    if (this.data.departureLatitude && this.data.departureLongitude) {
      const departureTimes = SunCalc.getTimes(new Date(departureDateTime), this.data.departureLatitude, this.data.departureLongitude);
      this.setData({
        departureSunrise: departureTimes.sunrise.toTimeString().slice(0, 5),
        departureSunset: departureTimes.sunset.toTimeString().slice(0, 5),
        departureDaylightPercentage: this.calculateDaylightPercentage(departureTimes.sunrise, departureTimes.sunset, departureDateTime)
      });
    }
    if (this.data.arrivalLatitude && this.data.arrivalLongitude) {
      const arrivalTimes = SunCalc.getTimes(new Date(arrivalDateTime), this.data.arrivalLatitude, this.data.arrivalLongitude);
      this.setData({
        arrivalSunrise: arrivalTimes.sunrise.toTimeString().slice(0, 5),
        arrivalSunset: arrivalTimes.sunset.toTimeString().slice(0, 5),
        arrivalDaylightPercentage: this.calculateDaylightPercentage(arrivalTimes.sunrise, arrivalTimes.sunset, arrivalDateTime)
      });
    }
  },


  // 计算日光占比并调整光强
  calculateDaylightPercentage: function(sunrise, sunset, dateTime) {
    const currentTime = new Date(dateTime).getTime();
    const sunriseTime = sunrise.getTime();
    const sunsetTime = sunset.getTime();
    
    if (currentTime < sunriseTime) {
      this.setDutyCycle(0); // 设为最暗
      return 0;
    } else if (currentTime > sunsetTime) {
      this.setDutyCycle(0); // 设为最暗
      return 0;
    } else {
      const totalDaylightMinutes = (sunsetTime - sunriseTime) / (1000 * 60);
      const passedDaylightMinutes = (currentTime - sunriseTime) / (1000 * 60);
      const daylightPercentage = (passedDaylightMinutes / totalDaylightMinutes) * 100;
      const dutyCycle = Math.floor((passedDaylightMinutes / totalDaylightMinutes) * 255); // 根据时间段调整占空比
      this.setDutyCycle(dutyCycle);
      return daylightPercentage;
    }
  },

  // 设置占空比
  setDutyCycle: function(dutyCycle) {
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

  // 连接蓝牙
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
    this.setDutyCycle(dutyCycle);
  },

  planPecentageChange(e) {
    let planPercentage = e.detail.value;
    this.setData({ planPercentage: planPercentage });
    // this.setDutyCycle(planPercentage);
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
