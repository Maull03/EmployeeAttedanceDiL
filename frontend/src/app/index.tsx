/**
 * Layar Utama Absensi (Kiosk) — index.tsx
 *
 * Fitur:
 * - Jam & tanggal real-time zona WIB
 * - Toggle Masuk | Pulang
 * - Tombol besar "Mulai Pindai" → navigasi ke /scan
 * - Ikon status server (GET /health) — hijau/merah
 * - Tautan kecil "Admin" di pojok kanan atas
 */
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { router, Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { getHealth } from '@/api/health';
import { useAttendanceTypeStore } from '@/store/attendanceType';
import { useTestModeStore } from '@/store/testMode';

function getWIBTime(): { time: string; date: string } {
  // WIB = UTC+7
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const hours = String(wib.getUTCHours()).padStart(2, '0');
  const minutes = String(wib.getUTCMinutes()).padStart(2, '0');
  const seconds = String(wib.getUTCSeconds()).padStart(2, '0');

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const dayName = days[wib.getUTCDay()];
  const dateNum = wib.getUTCDate();
  const monthName = months[wib.getUTCMonth()];
  const year = wib.getUTCFullYear();

  return {
    time: `${hours}:${minutes}:${seconds}`,
    date: `${dayName}, ${dateNum} ${monthName} ${year}`,
  };
}

export default function HomeScreen() {
  const [clock, setClock] = useState(getWIBTime);
  const attendanceType = useAttendanceTypeStore((s) => s.type);
  const toggleType = useAttendanceTypeStore((s) => s.toggle);
  const testMode = useTestModeStore((s) => s.isActive);
  const testConfig = useTestModeStore((s) => s.config);

  // Update jam setiap detik
  useEffect(() => {
    const timer = setInterval(() => setClock(getWIBTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Status server
  const { data: health, isError: serverDown } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 30_000,
    retry: 1,
  });

  const serverOk = !!health && !serverDown;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Banner MODE PENGUJIAN (§5.5) ───────────────────── */}
      {testMode && (
        <View style={styles.testBanner}>
          <Text style={styles.testBannerTitle}>⚠ MODE PENGUJIAN AKTIF</Text>
          <Text style={styles.testBannerSub}>
            {testConfig.scenario ?? 'Skenario'} · {testConfig.variant ?? '-'} · {testConfig.lighting ?? '-'}
            {testConfig.distance_cm ? ` · ${testConfig.distance_cm}cm` : ''}
          </Text>
        </View>
      )}

      {/* ── Tombol Admin (pojok kanan atas) ─────────────── */}
      <View style={styles.topRight}>
        <Link href="/admin/login" asChild>
          <TouchableOpacity style={styles.adminLink} activeOpacity={0.7}>
            <Text style={styles.adminLinkText}>⚙ Admin</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* ── Nama perusahaan ──────────────────────────────── */}
      <Text style={styles.companyName}>PT Hadi Scada Inovasindo</Text>
      <Text style={styles.companySub}>Sistem Absensi Wajah</Text>

      {/* ── Jam besar ────────────────────────────────────── */}
      <Text style={styles.time}>{clock.time}</Text>
      <Text style={styles.date}>{clock.date}</Text>

      {/* ── Status server ────────────────────────────────── */}
      <View style={styles.serverStatus}>
        <View
          style={[
            styles.serverDot,
            serverOk ? styles.dotGreen : styles.dotRed,
          ]}
        />
        <Text style={styles.serverText}>
          {serverOk ? 'Server terhubung' : 'Server tidak terhubung'}
        </Text>
      </View>

      {/* ── Toggle Masuk | Pulang ─────────────────────────── */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            attendanceType === 'check_in' && styles.toggleActive,
          ]}
          onPress={() => attendanceType !== 'check_in' && toggleType()}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.toggleText,
              attendanceType === 'check_in' && styles.toggleTextActive,
            ]}
          >
            Masuk
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            attendanceType === 'check_out' && styles.toggleActive,
          ]}
          onPress={() => attendanceType !== 'check_out' && toggleType()}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.toggleText,
              attendanceType === 'check_out' && styles.toggleTextActive,
            ]}
          >
            Pulang
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Tombol Mulai Pindai ──────────────────────────── */}
      <TouchableOpacity
        style={[styles.scanButton, !serverOk && styles.scanButtonDisabled]}
        onPress={() => router.push('/scan')}
        activeOpacity={0.85}
        disabled={!serverOk}
      >
        <Text style={styles.scanButtonText}>
          {serverOk ? '👁 Mulai Pindai' : '⚠ Server Tidak Tersedia'}
        </Text>
      </TouchableOpacity>

      {!serverOk && (
        <Text style={styles.serverWarning}>
          Pastikan server menyala dan terhubung ke jaringan yang sama.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  topRight: {
    position: 'absolute',
    top: 48,
    right: 20,
  },
  adminLink: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  adminLinkText: { color: 'rgba(255,255,255,0.75)', fontSize: 13 },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 4,
  },
  companySub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 32,
  },
  time: {
    fontSize: 72,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  date: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 20,
  },
  serverStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  serverDot: { width: 10, height: 10, borderRadius: 5 },
  dotGreen: { backgroundColor: '#4ade80' },
  dotRed: { backgroundColor: '#f87171' },
  serverText: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  // ── Toggle ──
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 50,
    padding: 4,
    marginBottom: 32,
    gap: 4,
  },
  toggleButton: {
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 46,
  },
  toggleActive: { backgroundColor: '#2563eb' },
  toggleText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  // ── Scan button ──
  scanButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 56,
    shadowColor: '#2563eb',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  scanButtonDisabled: {
    backgroundColor: '#374151',
    shadowOpacity: 0,
    elevation: 0,
  },
  scanButtonText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  serverWarning: {
    marginTop: 12,
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
  },
  // ── Test mode banner ──
  testBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ca8a04',
    paddingTop: 44,
    paddingBottom: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  testBannerTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 1,
  },
  testBannerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
  },
});
