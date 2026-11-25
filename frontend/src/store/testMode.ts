/**
 * store/testMode.ts — Zustand store untuk Mode Pengujian FAR/FRR.
 *
 * Saat aktif, layar scan mengirim dry_run=true + metadata uji
 * pada POST /attendance/verify.
 */
import { create } from 'zustand';
import type {
  EvaluationScenario,
  EvaluationVariant,
  EvaluationLighting,
  EvaluationDistance,
} from '@/api/types';

export interface TestModeConfig {
  scenario: EvaluationScenario;
  variant: EvaluationVariant;
  lighting: EvaluationLighting;
  distance_cm: EvaluationDistance;
  subject_employee_id: number | null;
  note: string;
  force_kind: 'blink' | 'turn' | null;
}

interface TestModeState {
  isActive: boolean;
  config: TestModeConfig;
  activate: () => void;
  deactivate: () => void;
  toggle: () => void;
  setConfig: (config: Partial<TestModeConfig>) => void;
}

const DEFAULT_CONFIG: TestModeConfig = {
  scenario: 'REAL',
  variant: 'REPEAT_1',
  lighting: 'BRIGHT',
  distance_cm: 100,
  subject_employee_id: null,
  note: '',
  force_kind: null,
};

export const useTestModeStore = create<TestModeState>((set) => ({
  isActive: false,
  config: DEFAULT_CONFIG,

  activate: () => set({ isActive: true }),
  deactivate: () => set({ isActive: false }),
  toggle: () => set((s) => ({ isActive: !s.isActive })),

  setConfig: (partial) =>
    set((s) => ({
      config: { ...s.config, ...partial },
    })),
}));
