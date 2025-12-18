export interface GPSData {
  imei: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

export interface WebSocketMessage {
  type: 'position_update' | 'device_status' | 'connected';
  data?: any;
  timestamp: string;
}
