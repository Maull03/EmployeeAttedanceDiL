import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  getEvaluationTrials,
  getEvaluationSummary,
  deleteEvaluationTrial,
  exportEvaluationCSV,
} from '@/api/evaluation';
import { useTestModeStore } from '@/store/testMode';
import { TrialConfigForm } from '@/features/evaluation/TrialConfigForm';
import { SummaryTable } from '@/features/evaluation/SummaryTable';
import type { EvaluationTrial, EvaluationScenario } from '@/api/types';

type Tab = 'config' | 'trials' | 'summary';

const SCENARIO_LABEL: Record<EvaluationScenario, string> = {
  REAL: 'Nyata',
  PRINT: 'Cetak',
  SCREEN: 'Layar',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function EvaluationScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('config');
  const [isExporting, setIsExporting] = useState(false);

  const { isActive, toggle } = useTestModeStore();
  const queryClient = useQueryClient();

  // ── Data percobaan ─────────────────────────────────────────
  const {
    data: trials,
    isLoading: loadingTrials,
    isError: errorTrials,
    refetch: refetchTrials,
  } = useQuery({
    queryKey: ['evaluation-trials'],
    queryFn: () => getEvaluationTrials(),
    enabled: activeTab === 'trials',
  });

  // ── Ringkasan FAR/FRR ──────────────────────────────────────
  const {
    data: summary,
    isLoading: loadingSummary,
    isError: errorSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['evaluation-summary'],
    queryFn: getEvaluationSummary,
    enabled: activeTab === 'summary',
  });

  // ── Hapus percobaan ────────────────────────────────────────
  const { mutate: doDelete } = useMutation({
    mutationFn: (id: number) => deleteEvaluationTrial(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation-trials'] });
      queryClient.invalidateQueries({ queryKey: ['evaluation-summary'] });
    },
    onError: () => Alert.alert('Error', 'Gagal menghapus percobaan.'),
  });

  const handleDelete = (trial: EvaluationTrial) => {
    Alert.alert(
      'Hapus Percobaan',
      `Hapus percobaan #${trial.id} (${SCENARIO_LABEL[trial.scenario]})?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: () => doDelete(trial.id) },
      ],
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportEvaluationCSV();
    } catch {
      Alert.alert('Error', 'Gagal mengekspor data evaluasi.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ── Header ──────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Evaluasi FAR/FRR</Text>
          {/* Banner mode pengujian aktif */}
          {isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>MODE PENGUJIAN AKTIF</Text>
            </View>
          )}
        </View>
        {activeTab === 'summary' && (
          <TouchableOpacity
            style={[styles.exportBtn, isExporting && styles.btnDisabled]}
            onPress={handleExport}
            disabled={isExporting}
            activeOpacity={0.8}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Text style={styles.exportBtnText}>↓ CSV</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── Saklar Mode Pengujian ───────────────────────── */}
      <View style={styles.switchRow}>
        <View style={styles.switchInfo}>
          <Text style={styles.switchLabel}>Aktifkan Mode Pengujian</Text>
          <Text style={styles.switchSub}>
            Scan akan menggunakan dry_run — tidak mencatat absensi nyata
          </Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={toggle}
          trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
          thumbColor={isActive ? '#2563eb' : '#f4f3f4'}
        />
      </View>

      {/* ── Tab bar ─────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {(['config', 'trials', 'summary'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'config' ? '⚙ Konfigurasi' : tab === 'trials' ? '📋 Percobaan' : '📊 Ringkasan'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Konten tab ──────────────────────────────────── */}
      {activeTab === 'config' && (
        <View style={styles.configNote}>
          <Text style={styles.configNoteText}>
            ⚠ Mode pengujian {isActive ? 'aktif' : 'tidak aktif'}.{' '}
            {isActive
              ? 'Layar scan akan mengirim metadata uji ke server.'
              : 'Aktifkan saklar di atas untuk memulai pengujian.'}
          </Text>
          <TrialConfigForm />
        </View>
      )}

      {activeTab === 'trials' && (
        <>
          {loadingTrials ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : errorTrials ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>Gagal memuat data percobaan.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => refetchTrials()}>
                <Text style={styles.retryText}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={trials ?? []}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Text style={styles.empty}>Belum ada percobaan yang dicatat.</Text>
              }
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <TrialRow trial={item} onDelete={() => handleDelete(item)} />
              )}
            />
          )}
        </>
      )}

      {activeTab === 'summary' && (
        <>
          {loadingSummary ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : errorSummary || !summary ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>Gagal memuat ringkasan.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => refetchSummary()}>
                <Text style={styles.retryText}>Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <SummaryTable summary={summary} />
          )}
        </>
      )}
    </View>
  );
}

function TrialRow({
  trial,
  onDelete,
}: {
  trial: EvaluationTrial;
  onDelete: () => void;
}) {
  const accepted = trial.status === 'accepted';
  return (
    <View style={styles.trialCard}>
      <View style={styles.trialLeft}>
        <Text style={styles.trialId}>#{trial.id}</Text>
        <Text style={styles.trialTime}>{formatDateTime(trial.created_at)}</Text>
      </View>
      <View style={styles.trialMid}>
        <Text style={styles.trialScenario}>{SCENARIO_LABEL[trial.scenario]}</Text>
        <Text style={styles.trialMeta}>
          {trial.variant} · {trial.lighting} · {trial.distance_cm}cm
        </Text>
        {trial.note ? (
          <Text style={styles.trialNote} numberOfLines={1}>
            {trial.note}
          </Text>
        ) : null}
      </View>
      <View style={styles.trialRight}>
        <View
          style={[
            styles.statusBadge,
            accepted ? styles.badgeAccepted : styles.badgeRejected,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              accepted ? styles.statusTextAccepted : styles.statusTextRejected,
            ]}
          >
            {accepted ? 'Diterima' : 'Ditolak'}
          </Text>
        </View>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteBtnText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: { gap: 4 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  activeBadge: {
    backgroundColor: '#fef08a',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: '#713f12' },
  exportBtn: {
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    minWidth: 60,
    alignItems: 'center',
  },
  exportBtnText: { color: '#2563eb', fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.6 },
  // ── Mode switch ──
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  switchInfo: { flex: 1 },
  switchLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  switchSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  // ── Tabs ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2563eb' },
  tabText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  tabTextActive: { color: '#2563eb' },
  // ── Config ──
  configNote: { flex: 1 },
  configNoteText: {
    fontSize: 13,
    color: '#78350f',
    backgroundColor: '#fef3c7',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  // ── List ──
  list: { padding: 16 },
  empty: { textAlign: 'center', color: '#6b7280', fontSize: 14, marginTop: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  errorText: { color: '#dc2626', fontSize: 15, textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  // ── Trial card ──
  trialCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    gap: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    alignItems: 'center',
  },
  trialLeft: { alignItems: 'center', width: 36 },
  trialId: { fontSize: 12, fontWeight: '700', color: '#374151' },
  trialTime: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },
  trialMid: { flex: 1, gap: 2 },
  trialScenario: { fontSize: 14, fontWeight: '700', color: '#111827' },
  trialMeta: { fontSize: 12, color: '#6b7280' },
  trialNote: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic' },
  trialRight: { alignItems: 'center', gap: 8 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeAccepted: { backgroundColor: '#dcfce7' },
  badgeRejected: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextAccepted: { color: '#16a34a' },
  statusTextRejected: { color: '#dc2626' },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 16 },
});
