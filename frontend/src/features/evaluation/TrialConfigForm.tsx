import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useTestModeStore, type TestModeConfig } from '@/store/testMode';
import { getEmployees } from '@/api/employees';
import type {
  EvaluationScenario,
  EvaluationVariant,
  EvaluationLighting,
  EvaluationDistance,
} from '@/api/types';

const SCENARIOS: EvaluationScenario[] = ['REAL', 'PRINT', 'SCREEN'];
const VARIANTS: Record<EvaluationScenario, EvaluationVariant[]> = {
  REAL: ['REPEAT_1', 'REPEAT_2'],
  PRINT: ['4R', 'A4'],
  SCREEN: ['PHOTO', 'VIDEO'],
};
const LIGHTINGS: EvaluationLighting[] = ['BRIGHT', 'DIM'];
const DISTANCES: EvaluationDistance[] = [50, 100];
const FORCE_KINDS: (TestModeConfig['force_kind'])[] = [null, 'blink', 'turn'];

const SCENARIO_LABEL: Record<EvaluationScenario, string> = {
  REAL: 'Nyata (REAL)',
  PRINT: 'Cetak (PRINT)',
  SCREEN: 'Layar (SCREEN)',
};
const VARIANT_LABEL: Record<EvaluationVariant, string> = {
  REPEAT_1: 'Percobaan 1',
  REPEAT_2: 'Percobaan 2',
  '4R': 'Foto 4R',
  A4: 'Foto A4',
  PHOTO: 'Foto di Layar',
  VIDEO: 'Video di Layar',
};
const LIGHTING_LABEL: Record<EvaluationLighting, string> = {
  BRIGHT: '☀ Terang',
  DIM: '🌑 Redup',
};
const FORCE_KIND_LABEL: Record<string, string> = {
  '': 'Acak (server)',
  blink: 'Kedip',
  turn: 'Toleh',
};

export function TrialConfigForm() {
  const { config, setConfig } = useTestModeStore();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getEmployees({ active: true }),
  });

  const availableVariants = VARIANTS[config.scenario];

  function handleScenarioChange(s: EvaluationScenario) {
    const firstVariant = VARIANTS[s][0];
    setConfig({ scenario: s, variant: firstVariant });
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Skenario */}
      <FieldLabel>Skenario</FieldLabel>
      <OptionRow>
        {SCENARIOS.map((s) => (
          <ChipButton
            key={s}
            label={SCENARIO_LABEL[s]}
            active={config.scenario === s}
            onPress={() => handleScenarioChange(s)}
          />
        ))}
      </OptionRow>

      {/* Varian */}
      <FieldLabel>Varian</FieldLabel>
      <OptionRow>
        {availableVariants.map((v) => (
          <ChipButton
            key={v}
            label={VARIANT_LABEL[v]}
            active={config.variant === v}
            onPress={() => setConfig({ variant: v })}
          />
        ))}
      </OptionRow>

      {/* Pencahayaan */}
      <FieldLabel>Pencahayaan</FieldLabel>
      <OptionRow>
        {LIGHTINGS.map((l) => (
          <ChipButton
            key={l}
            label={LIGHTING_LABEL[l]}
            active={config.lighting === l}
            onPress={() => setConfig({ lighting: l })}
          />
        ))}
      </OptionRow>

      {/* Jarak */}
      <FieldLabel>Jarak (cm)</FieldLabel>
      <OptionRow>
        {DISTANCES.map((d) => (
          <ChipButton
            key={d}
            label={`${d} cm`}
            active={config.distance_cm === d}
            onPress={() => setConfig({ distance_cm: d })}
          />
        ))}
      </OptionRow>

      {/* Jenis challenge (force_kind) */}
      <FieldLabel>Jenis Challenge</FieldLabel>
      <OptionRow>
        {FORCE_KINDS.map((k) => (
          <ChipButton
            key={k ?? 'auto'}
            label={FORCE_KIND_LABEL[k ?? '']}
            active={config.force_kind === k}
            onPress={() => setConfig({ force_kind: k })}
          />
        ))}
      </OptionRow>

      {/* Subjek karyawan */}
      <FieldLabel>Subjek Karyawan</FieldLabel>
      <View style={styles.empList}>
        {(employees ?? []).map((emp) => (
          <ChipButton
            key={emp.id}
            label={emp.full_name}
            active={config.subject_employee_id === emp.id}
            onPress={() => setConfig({ subject_employee_id: emp.id })}
          />
        ))}
        {!employees?.length && (
          <Text style={styles.noEmp}>Belum ada karyawan terdaftar.</Text>
        )}
      </View>

      {/* Catatan */}
      <FieldLabel>Catatan (opsional)</FieldLabel>
      <TextInput
        style={styles.noteInput}
        value={config.note}
        onChangeText={(t) => setConfig({ note: t })}
        placeholder="Mis: kondisi pencahayaan khusus…"
        multiline
        numberOfLines={2}
      />
    </ScrollView>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function OptionRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.optionRow}>{children}</View>;
}

function ChipButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 8 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
    marginBottom: 4,
  },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  chipTextActive: { color: '#2563eb' },
  empList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noEmp: { fontSize: 13, color: '#9ca3af' },
  noteInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
