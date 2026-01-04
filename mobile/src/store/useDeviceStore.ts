import { create } from 'zustand';

interface Device {
  id: string;
  imei: string;
  name?: string;
  batteryLevel?: number | null;
  batteryUpdatedAt?: string | null;
  type?: string;
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
  getLowBatteryCount: () => number;
  getLowBatteryDevices: () => Device[];
}

const LOW_BATTERY_THRESHOLD = 20;

export const useDeviceStore = create<DeviceStore>((set, get) => ({
  devices: [],
  selectedDevice: null,
  setDevices: (devices) => set({ devices }),
  addDevice: (device) => set((state) => ({ devices: [...state.devices, device] })),
  updateDevice: (id, updatedDevice) =>
    set((state) => ({
      devices: state.devices.map((d) => (d.id === id ? { ...d, ...updatedDevice } : d)),
    })),
  selectDevice: (device) => set({ selectedDevice: device }),
  getLowBatteryCount: () => {
    const { devices } = get();
    return devices.filter(
      (d) => d.type !== 'TAGGED_OBJECT' &&
             d.batteryLevel !== null &&
             d.batteryLevel !== undefined &&
             d.batteryLevel <= LOW_BATTERY_THRESHOLD
    ).length;
  },
  getLowBatteryDevices: () => {
    const { devices } = get();
    return devices.filter(
      (d) => d.type !== 'TAGGED_OBJECT' &&
             d.batteryLevel !== null &&
             d.batteryLevel !== undefined &&
             d.batteryLevel <= LOW_BATTERY_THRESHOLD
    );
  },
}));
