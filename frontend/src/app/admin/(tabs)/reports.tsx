import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getMonthlyReport, getAttendanceReport, downloadMonthlyCSV } from '@/api/reports';
import { MonthPicker } from '@/features/reports/MonthPicker';
import { MonthlyList } from '@/features/reports/MonthlyList';
import type { MonthlyReportItem, AttendanceReportItem } from '@/api/types';

function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(minutes: number | null): string {
  if (minutes == null) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}j ${m}m` : `${m}m`;
}

export default function ReportsScreen() {
  const [month, setMonth] = useState(currentMonthStr);
  const [selectedEmployee, setSelectedEmployee] = useState<MonthlyReportItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // ── Rekap bulanan ──────────────────────────────────────────
  const {
    data: monthly,
    isLoading: loadingMonthly,
    isError: errorMonthly,
    refetch: refetchMonthly,
  } = useQuery({
    queryKey: ['reports-monthly', month],
    queryFn: () => getMonthlyReport(month),
  });

  // ── Rincian harian (saat karyawan dipilih) ─────────────────
  const {
    data: dailyDetail,
    isLoading: loadingDetail,
  } = useQuery({
    queryKey: ['reports-daily', selectedEmployee?.employee_id, month],
    queryFn: () => {
      const [year, mon] = month.split('-');
      const lastDay = new Date(Number(year), Number(mon), 0).getDate();
      return getAttendanceReport({
        employee_id: selectedEmployee!.employee_id,
        date_from: `${month}-01`,
        date_to: `${month}-${String(lastDay).padStart(2, '0')}`,
      });
    },
    enabled: !!selectedEmployee,
  });

  // ── Ekspor CSV ─────────────────────────────────────────────
  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    try {
      const csv = await downloadMonthlyCSV(month);
      const fileName = `rekap_${month}.csv`;
      // SDK 58: gunakan File + Paths (bukan FileSystem legacy)
      const file = new File(Paths.document, fileName);
      await file.write(csv);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: `Ekspor Rekap ${month}`,
        });
      } else {
        Alert.alert('Info', `File disimpan di: ${file.uri}`);
      }
    } catch {
      Alert.alert('Error', 'Gagal mengekspor CSV. Periksa koneksi server.');
    } finally {
      setIsExporting(false);
    }
  }, [month]);

  return (
    <View style={styles.container}>
      {/* ── Header ──────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Rekap Kehadiran</Text>
        <TouchableOpacity
          style={[styles.exportBtn, isExporting && styles.btnDisabled]}
          onPress={handleExportCSV}
          disabled={isExporting}
          activeOpacity={0.8}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Text style={styles.exportBtnText}>↓ CSV</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Pemilih bulan ───────────────────────────────── */}
      <MonthPicker value={month} onChange={setMonth} />

      {/* ── Konten ─────────────────────────────────────── */}
      {loadingMonthly ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Memuat rekap…</Text>
        </View>
      ) : errorMonthly ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Gagal memuat data rekap.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetchMonthly()}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <MonthlyList
          data={monthly ?? []}
          onSelectEmployee={setSelectedEmployee}
        />
      )}

      {/* ── Modal rincian harian ────────────────────────── */}
      <Modal
        visible={!!selectedEmployee}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedEmployee(null)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedEmployee?.full_name}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedEmployee(null)}
              style={styles.closeBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loadingDetail ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : (
            <FlatList
              data={dailyDetail ?? []}
              keyExtractor={(item) => item.work_date}
              contentContainerStyle={styles.detailList}
              ListEmptyComponent={
                <Text style={styles.emptyDetail}>Tidak ada catatan absensi.</Text>
              }
              renderItem={({ item }) => <DailyRow item={item} />}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

function DailyRow({ item }: { item: AttendanceReportItem }) {
  const hasCheckout = !!item.check_out_at;
  return (
    <View style={styles.dailyRow}>
      <View style={styles.dailyDate}>
        <Text style={styles.dailyDateText}>{item.work_date.slice(8)}</Text>
        <Text style={styles.dailyMonthText}>{item.work_date.slice(5, 7)}</Text>
      </View>
      <View style={styles.dailyInfo}>
        <View style={styles.dailyTimes}>
          <TimeChip label="Masuk" value={formatDate(item.check_in_at)} color="#16a34a" />
          <TimeChip
            label="Pulang"
            value={formatDate(item.check_out_at)}
            color={hasCheckout ? '#2563eb' : '#9ca3af'}
          />
        </View>
        <Text style={styles.dailyDuration}>
          {formatDuration(item.duration_minutes)}
        </Text>
      </View>
    </View>
  );
}

function TimeChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.chip}>
      <Text style={[styles.chipLabel, { color }]}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
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
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  loadingText: { color: '#6b7280', fontSize: 14 },
  errorText: { color: '#dc2626', fontSize: 15, textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  // ── Modal ──
  modal: { flex: 1, backgroundColor: '#f5f6fa' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1 },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginLeft: 12,
  },
  closeBtnText: { fontSize: 16, color: '#374151' },
  detailList: { padding: 16, gap: 10 },
  emptyDetail: { textAlign: 'center', color: '#6b7280', fontSize: 14, marginTop: 32 },
  // ── Daily row ──
  dailyRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  dailyDate: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyDateText: { fontSize: 20, fontWeight: '800', color: '#111827' },
  dailyMonthText: { fontSize: 11, color: '#6b7280' },
  dailyInfo: { flex: 1, gap: 4 },
  dailyTimes: { flexDirection: 'row', gap: 10 },
  dailyDuration: { fontSize: 12, color: '#6b7280' },
  chip: { gap: 1 },
  chipLabel: { fontSize: 10, fontWeight: '700' },
  chipValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
