import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { EvaluationSummary, EvaluationScenario } from '@/api/types';

interface SummaryTableProps {
  summary: EvaluationSummary;
}

const SCENARIO_LABELS: Record<EvaluationScenario, string> = {
  REAL: 'Nyata',
  PRINT: 'Cetak',
  SCREEN: 'Layar',
};

export function SummaryTable({ summary }: SummaryTableProps) {
  const scenarios = Object.entries(summary.scenarios) as [
    EvaluationScenario,
    (typeof summary.scenarios)[EvaluationScenario],
  ][];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Target */}
      <View style={styles.targetBadge}>
        <Text style={styles.targetText}>
          Target per skenario: {summary.target_per_scenario} percobaan
        </Text>
      </View>

      {/* Tabel per skenario */}
      {scenarios.map(([scenario, data]) => (
        <View key={scenario} style={styles.card}>
          <Text style={styles.cardTitle}>{SCENARIO_LABELS[scenario]}</Text>

          <View style={styles.row}>
            <MetricCell
              label="Total"
              value={`${data.total}/${summary.target_per_scenario}`}
              color="#374151"
            />
            <MetricCell label="Diterima" value={String(data.accepted)} color="#16a34a" />
            <MetricCell label="Ditolak" value={String(data.rejected)} color="#dc2626" />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <MetricCell
              label="FAR %"
              value={`${data.far_percent.toFixed(1)}%`}
              color="#f59e0b"
              hint="False Acceptance Rate"
            />
            <MetricCell
              label="FRR %"
              value={`${data.frr_percent.toFixed(1)}%`}
              color="#8b5cf6"
              hint="False Rejection Rate"
            />
            <MetricCell
              label="Tolak Serangan"
              value={`${data.attack_rejection_rate_percent.toFixed(1)}%`}
              color="#0891b2"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <MetricCell
              label="Liveness Gagal"
              value={String(data.liveness_rejected)}
              color="#dc2626"
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function MetricCell({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: string;
  color: string;
  hint?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {hint && <Text style={styles.metricHint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  targetBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  targetText: { color: '#1d4ed8', fontWeight: '700', fontSize: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 10,
  },
  metric: { alignItems: 'center', flex: 1 },
  metricValue: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  metricLabel: { fontSize: 11, color: '#6b7280', textAlign: 'center' },
  metricHint: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },
});
