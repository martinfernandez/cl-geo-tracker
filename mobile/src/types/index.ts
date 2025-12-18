export interface Device {
  id: string;
  imei: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  createdAt: string;
}

export interface WSMessage {
  type: 'position_update' | 'device_status' | 'connected';
  data?: any;
  timestamp: string;
}
