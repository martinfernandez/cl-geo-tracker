export interface GPSData {
  imei: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

export interface DeviceStatusData {
  imei: string;
  batteryLevel: number;
  isCharging: boolean;
  gsmSignal: number;
}
