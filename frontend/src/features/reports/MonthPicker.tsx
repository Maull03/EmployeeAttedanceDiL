import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (month: string) => void;
}

function parseMonth(value: string): { year: number; month: number } {
  const [y, m] = value.split('-').map(Number);
  return { year: y, month: m };
}

function formatMonthLabel(value: string): string {
  const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const { year, month } = parseMonth(value);
  return `${MONTHS[month - 1]} ${year}`;
}

function addMonth(value: string, delta: number): string {
  const { year, month } = parseMonth(value);
  const d = new Date(year, month - 1 + delta, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = value === currentMonth;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.arrow}
        onPress={() => onChange(addMonth(value, -1))}
        activeOpacity={0.7}
      >
        <Text style={styles.arrowText}>‹</Text>
      </TouchableOpacity>

      <Text style={styles.label}>{formatMonthLabel(value)}</Text>

      <TouchableOpacity
        style={[styles.arrow, isCurrentMonth && styles.arrowDisabled]}
        onPress={() => !isCurrentMonth && onChange(addMonth(value, 1))}
        disabled={isCurrentMonth}
        activeOpacity={0.7}
      >
        <Text style={[styles.arrowText, isCurrentMonth && styles.arrowTextDisabled]}>
          ›
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  arrow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  arrowDisabled: { backgroundColor: '#f3f4f6' },
  arrowText: { fontSize: 22, color: '#2563eb', fontWeight: '700', lineHeight: 26 },
  arrowTextDisabled: { color: '#d1d5db' },
  label: { fontSize: 17, fontWeight: '700', color: '#111827', minWidth: 160, textAlign: 'center' },
});
