/**
 * ResultView — layar penuh hasil absensi (hijau = diterima, merah = ditolak).
 * Otomatis kembali ke idle setelah 4 detik.
 */
import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { VerifyResponse } from '@/api/types';
import { REASON_MESSAGES } from '@/constants/messages';
import { formatWIB } from '@/lib/time';

interface ResultViewProps {
  result: VerifyResponse;
  onRepeat: () => void;
  onDone: () => void;
}

export function ResultView({ result, onRepeat, onDone }: ResultViewProps) {
  const accepted = result.status === 'accepted';

  // Otomatis kembali setelah 4 detik
  useEffect(() => {
    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, [onDone]);

  const reason = result.reason;
  const message = reason
    ? (REASON_MESSAGES[reason] ?? result.message)
    : result.message;

  return (
    <View style={[styles.container, accepted ? styles.bgAccepted : styles.bgRejected]}>
      {/* Ikon */}
      <Text style={styles.icon}>{accepted ? '✅' : '❌'}</Text>

      {/* Status */}
      <Text style={styles.statusText}>
        {accepted ? 'Absensi Berhasil' : 'Absensi Ditolak'}
      </Text>

      {/* Detail */}
      {accepted && result.employee && (
        <>
          <Text style={styles.name}>{result.employee.full_name}</Text>
          <Text style={styles.detail}>
            {result.attendance?.type === 'check_in' ? 'Absen Masuk' : 'Absen Pulang'}
          </Text>
          {result.attendance?.at && (
            <Text style={styles.time}>{formatWIB(result.attendance.at)}</Text>
          )}
        </>
      )}

      {!accepted && (
        <Text style={styles.reason}>{message}</Text>
      )}

      {/* Tombol */}
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.repeatButton} onPress={onRepeat}>
          <Text style={styles.repeatText}>Ulangi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneButton} onPress={onDone}>
          <Text style={styles.doneText}>Selesai</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.autoClose}>Kembali otomatis dalam 4 detik…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  bgAccepted: { backgroundColor: '#16a34a' },
  bgRejected: { backgroundColor: '#dc2626' },
  icon: { fontSize: 72, marginBottom: 16 },
  statusText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  detail: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 4,
  },
  time: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  reason: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  repeatButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  repeatText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  doneButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  doneText: { fontWeight: '700', fontSize: 15, color: '#1f2937' },
  autoClose: {
    marginTop: 20,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
});
