import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import type { MonthlyReportItem } from '@/api/types';

interface MonthlyListProps {
  data: MonthlyReportItem[];
  onSelectEmployee: (item: MonthlyReportItem) => void;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}j ${m}m`;
}

export function MonthlyList({ data, onSelectEmployee }: MonthlyListProps) {
  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Tidak ada data kehadiran bulan ini.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => String(item.employee_id)}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => onSelectEmployee(item)}
          activeOpacity={0.75}
        >
          <View style={styles.row}>
            {/* Avatar */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>

            {/* Info */}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {item.full_name}
              </Text>
              <View style={styles.stats}>
                <StatBadge label="Hadir" value={`${item.days_present}h`} color="#16a34a" />
                <StatBadge
                  label="Checkout"
                  value={`${item.days_with_checkout}h`}
                  color="#2563eb"
                />
                <StatBadge
                  label="Total"
                  value={formatDuration(item.total_work_minutes)}
                  color="#7c3aed"
                />
              </View>
            </View>

            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '18' }]}>
      <Text style={[styles.badgeValue, { color }]}>{value}</Text>
      <Text style={styles.badgeLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  separator: { height: 10 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#1d4ed8' },
  info: { flex: 1, gap: 6 },
  name: { fontSize: 15, fontWeight: '600', color: '#111827' },
  stats: { flexDirection: 'row', gap: 6 },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignItems: 'center',
  },
  badgeValue: { fontSize: 12, fontWeight: '700' },
  badgeLabel: { fontSize: 10, color: '#6b7280' },
  chevron: { fontSize: 22, color: '#9ca3af' },
});
