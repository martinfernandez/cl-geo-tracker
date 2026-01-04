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
  batteryLevel: number; // 0-100 percentage
  isCharging?: boolean;
  gsmSignal?: number; // 0-100 percentage
}

export interface WebSocketMessage {
  type: 'position_update' | 'device_status' | 'connected';
  data?: any;
  timestamp: string;
}
