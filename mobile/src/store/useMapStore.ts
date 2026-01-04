import { create } from 'zustand';

interface CenterArea {
  latitude: number;
  longitude: number;
  radius: number;
  name: string;
}

interface MapStore {
  pendingCenterArea: CenterArea | null;
  setPendingCenterArea: (area: CenterArea | null) => void;
  clearPendingCenterArea: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
  pendingCenterArea: null,
  setPendingCenterArea: (area) => set({ pendingCenterArea: area }),
  clearPendingCenterArea: () => set({ pendingCenterArea: null }),
}));
