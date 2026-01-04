import { create } from 'zustand';
import { Group } from '../services/api';

interface GroupStore {
  activeGroup: Group | null;
  setActiveGroup: (group: Group | null) => void;
  clearActiveGroup: () => void;
}

export const useGroupStore = create<GroupStore>((set) => ({
  activeGroup: null,
  setActiveGroup: (group) => set({ activeGroup: group }),
  clearActiveGroup: () => set({ activeGroup: null }),
}));
