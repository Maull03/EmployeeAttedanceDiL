/**
 * Layar Pemindaian (scan.tsx)
 *
 * Aturan teknis:
 * - videoQuality: '480p', mute: true (di useScanMachine)
 * - Teks instruksi challenge: fontSize 32+, fontWeight '900', warna putih
 *   dengan shadow gelap — terbaca jelas dari 100 cm
 * - File video dihapus setelah upload (di useScanMachine via expo-file-system)
 */
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef } from 'react';
import type { CameraView as CameraViewType } from 'expo-camera';

import { useScanMachine } from '@/features/attendance/useScanMachine';
import { CameraFrame } from '@/features/attendance/CameraFrame';
import { Countdown } from '@/features/attendance/Countdown';
import { ResultView } from '@/features/attendance/ResultView';
import { useAttendanceTypeStore } from '@/store/attendanceType';

export default function ScanScreen() {
  const cameraRef = useRef<CameraViewType | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const attendanceType = useAttendanceTypeStore((s) => s.type);
  const machine = useScanMachine(attendanceType);

  // ── Izin kamera ─────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permTitle}>📷 Izin Kamera Diperlukan</Text>
        <Text style={styles.permDesc}>
          Kamera depan digunakan untuk memindai wajah saat absensi.
        </Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Izinkan Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── State: result ────────────────────────────────────────────
  if (machine.state === 'result' && machine.verifyResult) {
    return (
      <ResultView
        result={machine.verifyResult}
        onRepeat={machine.backToIdle}
        onDone={machine.backToIdle}
      />
    );
  }

  // ── State: idle — belum mulai ────────────────────────────────
  if (machine.state === 'idle') {
    return (
      <View style={styles.idleContainer}>
        <Text style={styles.idleHint}>Siap untuk memindai wajah</Text>
        {machine.errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{machine.errorMessage}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => machine.start(cameraRef)}
          activeOpacity={0.85}
        >
          <Text style={styles.startButtonText}>▶ Mulai Pindai</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>← Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── State: requestingChallenge ───────────────────────────────
  if (machine.state === 'requestingChallenge') {
    return (
      <View style={[styles.scanContainer, styles.bgDark]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.statusText}>Meminta tantangan…</Text>
      </View>
    );
  }

  // ── State: uploading ─────────────────────────────────────────
  if (machine.state === 'uploading') {
    return (
      <View style={[styles.scanContainer, styles.bgDark]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.statusText}>Memverifikasi…</Text>
        <Text style={styles.statusSub}>Harap tunggu, sedang diproses oleh server.</Text>
      </View>
    );
  }

  // ── State: preparing & recording — tampilkan kamera ─────────
  const isPreparing = machine.state === 'preparing';
  const isRecording = machine.state === 'recording';
  const instruction = machine.challenge?.instruction ?? '';

  return (
    <View style={[styles.scanContainer, styles.bgDark]}>
      {/* Kamera */}
      <CameraFrame cameraRef={cameraRef} />

      {/* ── Instruksi challenge — teks BESAR & KONTRAS ──────────
          Harus terbaca jelas dari jarak 100 cm:
          fontSize 34, fontWeight '900', warna putih + shadow gelap  */}
      {instruction ? (
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>{instruction}</Text>
        </View>
      ) : null}

      {/* Hitung mundur prepare atau bar recording */}
      {isPreparing && (
        <Countdown value={machine.countdown} mode="prepare" />
      )}
      {isRecording && (
        <Countdown
          value={machine.recordingCountdown}
          mode="recording"
          total={machine.challenge?.window_seconds ?? 5}
        />
      )}

      {/* Label status */}
      <Text style={styles.stateLabel}>
        {isPreparing ? '⏳ Bersiap…' : '🔴 Merekam'}
      </Text>

      {/* Tombol batal — hanya tersedia saat recording */}
      {isRecording && (
        <TouchableOpacity style={styles.cancelButton} onPress={machine.cancel}>
          <Text style={styles.cancelText}>Batal</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
    padding: 24,
  },
  // ── Permission ──
  permTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  permDesc: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  permButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // ── Idle ──
  idleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 32,
    gap: 16,
  },
  idleHint: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  errorBox: {
    backgroundColor: 'rgba(220,38,38,0.2)',
    borderColor: '#dc2626',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorText: { color: '#fca5a5', fontSize: 14, textAlign: 'center' },
  startButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 8,
  },
  startButtonText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  backLink: { padding: 8, marginTop: 8 },
  backLinkText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  // ── Scan container ──
  scanContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  bgDark: { backgroundColor: '#111827' },
  // ── Instruksi challenge — BESAR & KONTRAS untuk 100 cm ──
  instructionBox: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 8,
    maxWidth: '90%',
  },
  instructionText: {
    fontSize: 34,           // besar agar terbaca 100 cm
    fontWeight: '900',      // tebal maksimal
    color: '#FFFFFF',       // putih kontras di atas latar gelap
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    lineHeight: 42,
  },
  statusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
  statusSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    textAlign: 'center',
  },
  stateLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  cancelText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
