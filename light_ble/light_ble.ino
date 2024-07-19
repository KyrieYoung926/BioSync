#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <esp32-hal-ledc.h>

const int pwmChannel = 0; // PWM通道
const int pwmFreq = 5000; // PWM频率，单位Hz
const int pwmResolution = 8; // PWM分辨率，8位或者12位

int pwmPin = 2; // 假设你选择了GPIO2作为PWM输出

// 定义服务和特征的UUID
#define SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define PWM_CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

BLEServer *pServer;
BLEService *pService;
BLECharacteristic *pPWMCharacteristic;

int dutyCycle = 0;
bool bleConnected = false;

class PWMCharacteristicCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    Serial.println(pCharacteristic->getValue().c_str());
    String value = pCharacteristic->getValue().c_str();
    if (value.length() > 0) {
      int newDutyCycle = atoi(value.c_str());
      // 根据新的PWM值设置占空比
      if (newDutyCycle >= 0 && newDutyCycle <= 255) {
        dutyCycle = newDutyCycle;
        // 设置PWM占空比
        Serial.print("设置PWM占空比为: ");
        Serial.println(dutyCycle);
        ledcWrite(pwmPin, dutyCycle); // 设置PWM信号的占空比
      }
    }
  }
};

class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    bleConnected = true;
    Serial.println("BLE连接已建立");
  }

  void onDisconnect(BLEServer* pServer) {
    bleConnected = false;
    Serial.println("BLE连接已断开");
    // 当连接断开时重新启动广播
    BLEAdvertising *pAdvertising = pServer->getAdvertising();
    pAdvertising->start();
    Serial.println("重新启动广播");
  }
};

void setup() {
  Serial.begin(115200);

  ledcAttachChannel(pwmPin, pwmFreq, pwmResolution, pwmChannel);

  // 初始化BLE设备
  BLEDevice::init("ESP32_PWM_Control");

  // 创建BLE服务
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  pService = pServer->createService(SERVICE_UUID);

  // 创建PWM特征并设置回调
  pPWMCharacteristic = pService->createCharacteristic(
    PWM_CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_WRITE
  );
  pPWMCharacteristic->setCallbacks(new PWMCharacteristicCallbacks());

  // 启动BLE服务
  pService->start();

  // 启动广播
  BLEAdvertising *pAdvertising = pServer->getAdvertising();
  pAdvertising->start();

  Serial.println("等待BLE连接...");
}

void loop() {
  // 这里可以处理其他任务，如定时器、传感器读取等
  delay(100);
}
