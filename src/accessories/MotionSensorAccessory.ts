import { Service, PlatformAccessory } from 'homebridge';

import { EufySecurityPlatform } from '../platform';

// import { HttpService, LocalLookupService, DeviceClientService, CommandType } from 'eufy-node-client';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore  
import { Device, MotionSensor, PropertyValue, DeviceType } from 'eufy-security-client';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class MotionSensorAccessory {
  private service: Service;
  private motion_triggered: boolean;

  constructor(
    private readonly platform: EufySecurityPlatform,
    private readonly accessory: PlatformAccessory,
    private eufyDevice: MotionSensor,
  ) {
    this.platform.log.debug(this.accessory.displayName, 'Constructed Motion Sensor');

    this.motion_triggered = false;

    // set accessory information
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Eufy')
      .setCharacteristic(
        this.platform.Characteristic.Model,
        DeviceType[eufyDevice.getDeviceType()],
      )
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        eufyDevice.getSerial(),
      )
      .setCharacteristic(
        this.platform.Characteristic.FirmwareRevision,
        eufyDevice.getSoftwareVersion(),
      )
      .setCharacteristic(
        this.platform.Characteristic.HardwareRevision,
        eufyDevice.getHardwareVersion(),
      );

    this.service =
      this.accessory.getService(this.platform.Service.MotionSensor) ||
      this.accessory.addService(this.platform.Service.MotionSensor);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      accessory.displayName,
    );

    // create handlers for required characteristics
    this.service
      .getCharacteristic(this.platform.Characteristic.MotionDetected)
      .on('get', this.handleMotionDetectedGet.bind(this));

    this.eufyDevice.on('motion detected', (device: Device, motion: boolean) =>
      this.onDeviceMotionDetectedPushNotification(device, motion),
    );

    if(this.eufyDevice.isBatteryLow && this.eufyDevice.isBatteryLow()) {
      this.platform.log.debug(this.accessory.displayName, 'has a battery, so append batteryService characteristic to him.');

      const batteryService =
      this.accessory.getService(this.platform.Service.Battery) ||
      this.accessory.addService(this.platform.Service.Battery);

      // set the Battery service characteristics
      batteryService.setCharacteristic(
        this.platform.Characteristic.Name,
        accessory.displayName,
      );

      // create handlers for required characteristics of Battery service
      batteryService
        .getCharacteristic(this.platform.Characteristic.BatteryLevel)
        .on('get', this.handleBatteryLevelGet.bind(this));
    }

    if(this.platform.config.enableDetailedLogging) {
      this.eufyDevice.on('raw property changed', (device: Device, type: number, value: string, modified: number) =>
        this.handleRawPropertyChange(device, type, value, modified),
      );
      this.eufyDevice.on('property changed', (device: Device, name: string, value: PropertyValue) =>
        this.handlePropertyChange(device, name, value),
      );
    }
  }

  async isMotionDetected() {
    const isMotionDetected = this.eufyDevice.isMotionDetected();
    return isMotionDetected as boolean;
  }

  /**
   * Handle requests to get the current value of the 'Security System Current State' characteristic
   */
  async handleMotionDetectedGet(callback) {
    this.platform.log.debug(this.accessory.displayName, 'Triggered GET MotionDetected');

    const currentValue = await this.isMotionDetected();
    this.platform.log.debug(this.accessory.displayName, 'Handle Motion Sensor:  -- ', currentValue);

    callback(null, currentValue as boolean);
  }

  private onDeviceMotionDetectedPushNotification(
    device: Device,
    motion: boolean,
  ): void {
    this.motion_triggered = (this.motion_triggered) ? false : true;
    this.platform.log.info(this.accessory.displayName, 'Handle Motion Sensor:  -- ', this.motion_triggered);
    this.service
      .getCharacteristic(this.platform.Characteristic.MotionDetected)
      .updateValue(this.motion_triggered);
  }

  /**
   * Handle requests to get the current value of the "Status Low Battery" characteristic
   */
  async handleBatteryLevelGet(callback) {
    this.platform.log.debug(this.accessory.displayName, 'Triggered GET BatteryLevel');

    // set this to a valid value for SecuritySystemCurrentState
    const currentValue = await this.getCurrentBatteryLevel();
    this.platform.log.debug(this.accessory.displayName, 'Handle Current battery level:  -- ', currentValue);

    callback(null, currentValue);
  }

  async getCurrentBatteryLevel() {
    const batteryLevel = this.eufyDevice.isBatteryLow();

    return batteryLevel.value as number;
  }

  private handleRawPropertyChange(
    device: Device, 
    type: number, 
    value: string, 
    modified: number,
  ): void {
    this.platform.log.info(
      'Handle MotionSensor Raw Property Changes:  -- ',
      type, 
      value, 
      modified,
    );
  }

  private handlePropertyChange(
    device: Device, 
    name: string, 
    value: PropertyValue,
  ): void {
    this.platform.log.info(
      'Handle MotionSensor Property Changes:  -- ',
      name, 
      value,
    );
  }
}
