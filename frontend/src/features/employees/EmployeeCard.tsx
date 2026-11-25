import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Employee } from '@/api/types';

interface EmployeeCardProps {
  employee: Employee;
  onPress: () => void;
}

export function EmployeeCard({ employee, onPress }: EmployeeCardProps) {
  const hasFace = employee.face_registered;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Avatar placeholder */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {employee.full_name.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {employee.full_name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {employee.employee_code}
          {employee.position ? ` · ${employee.position}` : ''}
        </Text>

        {/* Face badge */}
        <View
          style={[
            styles.badge,
            hasFace ? styles.badgeSuccess : styles.badgeMissing,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              hasFace ? styles.badgeTextSuccess : styles.badgeTextMissing,
            ]}
          >
            {hasFace
              ? `✔ Wajah terdaftar (${employee.face_samples} sampel)`
              : '✗ Belum ada wajah'}
          </Text>
        </View>
      </View>

      {/* Chevron */}
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 13, color: '#6b7280' },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeMissing: { backgroundColor: '#fef9c3' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextSuccess: { color: '#16a34a' },
  badgeTextMissing: { color: '#854d0e' },
  chevron: { fontSize: 22, color: '#9ca3af', lineHeight: 24 },
});
