import { create } from 'zustand';
import type { AttendanceType } from '@/features/attendance/useScanMachine';

interface AttendanceTypeState {
  type: AttendanceType;
  toggle: () => void;
  setType: (type: AttendanceType) => void;
}

export const useAttendanceTypeStore = create<AttendanceTypeState>((set) => ({
  type: 'check_in',
  toggle: () =>
    set((s) => ({ type: s.type === 'check_in' ? 'check_out' : 'check_in' })),
  setType: (type) => set({ type }),
}));
