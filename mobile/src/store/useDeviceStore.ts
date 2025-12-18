import { create } from 'zustand';

interface Device {
  id: string;
  imei: string;
  name?: string;
  lastPosition?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
}

interface DeviceStore {
  devices: Device[];
  selectedDevice: Device | null;
  setDevices: (devices: Device[]) => void;
  addDevice: (device: Device) => void;
  updateDevice: (id: string, device: Partial<Device>) => void;
  selectDevice: (device: Device | null) => void;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  devices: [],
  selectedDevice: null,
  setDevices: (devices) => set({ devices }),
  addDevice: (device) => set((state) => ({ devices: [...state.devices, device] })),
  updateDevice: (id, updatedDevice) =>
    set((state) => ({
      devices: state.devices.map((d) => (d.id === id ? { ...d, ...updatedDevice } : d)),
    })),
  selectDevice: (device) => set({ selectedDevice: device }),
}));
