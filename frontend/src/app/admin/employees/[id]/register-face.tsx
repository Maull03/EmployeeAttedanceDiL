/**
 * Registrasi Wajah — 5 pose berurutan.
 *
 * Aturan teknis:
 * - takePictureAsync({ quality: 0.8 }), CameraView facing="front"
 * - Saat retake pose gagal: kirim ulang SELURUH 5 foto (foto lama valid + foto baru)
 *   dengan replace=true ke POST /employees/{id}/face
 * - Hapus file sementara setelah upload selesai (expo-file-system)
 */
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useCallback } from 'react';
import { File } from 'expo-file-system';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteFace } from '@/api/employees';
import { useFaceCapture, POSES } from '@/features/registration/useFaceCapture';
import { PoseGuide } from '@/features/registration/PoseGuide';
import type { CameraView as CameraViewType } from 'expo-camera';

export default function RegisterFaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const employeeId = Number(id);
  const queryClient = useQueryClient();

  const cameraRef = useRef<CameraViewType | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const {
    captures,
    activePoseIndex,
    isUploading,
    uploadResult,
    uploadError,
    capturePhoto,
    setActivePose,
    uploadAll,
    reset,
    allCaptured,
  } = useFaceCapture();

  // Hitung pose mana yang gagal (perlu retake)
  const failedIndices = captures
    .map((c, i) => (c.ok === false ? i : -1))
    .filter((i) => i >= 0);
  const hasFailures = failedIndices.length > 0;
  const allOk = uploadResult?.registered === true;

  // ── Hapus data wajah ────────────────────────────────────────
  const { mutate: doDeleteFace, isPending: isDeleting } = useMutation({
    mutationFn: () => deleteFace(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      Alert.alert('Berhasil', 'Data wajah berhasil dihapus.');
      router.back();
    },
    onError: () => {
      Alert.alert('Error', 'Gagal menghapus data wajah.');
    },
  });

  const handleDeleteFace = useCallback(() => {
    Alert.alert(
      'Hapus Data Wajah',
      'Semua data wajah karyawan ini akan dihapus permanen. Lanjutkan?',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: () => doDeleteFace() },
      ],
    );
  }, [doDeleteFace]);

  // ── Handle retake: arahkan ke pose gagal pertama ─────────────
  const handleRetake = useCallback(() => {
    if (failedIndices.length > 0) {
      setActivePose(failedIndices[0]);
    }
  }, [failedIndices, setActivePose]);

  // ── Upload (atau re-upload dengan replace=true) ──────────────
  const handleUpload = useCallback(async () => {
    await uploadAll(employeeId);
    // Invalidate setelah upload berhasil
    queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
  }, [uploadAll, employeeId, queryClient]);

  // ── Cleanup file sementara setelah sukses ───────────────────
  const handleDone = useCallback(async () => {
    // Hapus semua file foto sementara dari device (D6, SDK 58)
    for (const cap of captures) {
      if (cap.uri) {
        try { new File(cap.uri).delete(); } catch { /* ignore */ }
      }
    }
    router.back();
  }, [captures]);

  // ── Permission belum diberikan ───────────────────────────────
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
          Kamera depan dibutuhkan untuk mengambil foto wajah karyawan.
        </Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Izinkan Kamera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Sukses total ─────────────────────────────────────────────
  if (allOk) {
    return (
      <View style={[styles.center, styles.successBg]}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Registrasi Wajah Berhasil!</Text>
        <Text style={styles.successSub}>
          {uploadResult.valid_count} dari {POSES.length} foto valid terdaftar.
        </Text>
        <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
          <Text style={styles.doneButtonText}>Selesai</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentCapture = captures[activePoseIndex];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* ── Panduan pose ───────────────────────────────── */}
      <View style={styles.guideSection}>
        <Text style={styles.sectionTitle}>Ambil 5 Foto Pose</Text>
        <Text style={styles.sectionSub}>
          Ketuk pose merah untuk mengambil ulang. Pastikan pencahayaan merata,
          tanpa masker atau kacamata gelap, hanya 1 wajah.
        </Text>
        <PoseGuide
          captures={captures}
          activePoseIndex={activePoseIndex}
          onSelectPose={setActivePose}
        />
      </View>

      {/* ── Info pose aktif ────────────────────────────── */}
      <View style={styles.activePoseBar}>
        <Text style={styles.activePoseLabel}>Pose saat ini:</Text>
        <Text style={styles.activePoseName}>{currentCapture.pose}</Text>
        <Text style={styles.activePoseHint}>
          {activePoseIndex + 1} / {POSES.length}
        </Text>
      </View>

      {/* ── Kamera ─────────────────────────────────────── */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
        />
        {/* Overlay oval guide */}
        <View style={styles.ovalOverlay} pointerEvents="none" />
      </View>

      {/* ── Tombol ambil foto ──────────────────────────── */}
      <TouchableOpacity
        style={styles.captureButton}
        onPress={() => capturePhoto(cameraRef)}
        activeOpacity={0.8}
      >
        <Text style={styles.captureButtonText}>📸 Ambil Foto</Text>
      </TouchableOpacity>

      {/* ── Thumbnail 5 foto ───────────────────────────── */}
      <View style={styles.thumbnailRow}>
        {captures.map((cap, i) => (
          <TouchableOpacity
            key={cap.pose}
            style={[
              styles.thumbnail,
              i === activePoseIndex && styles.thumbnailActive,
              cap.ok === false && styles.thumbnailFailed,
            ]}
            onPress={() => setActivePose(i)}
            activeOpacity={0.75}
          >
            {cap.uri ? (
              <Image source={{ uri: cap.uri }} style={styles.thumbnailImage} />
            ) : (
              <Text style={styles.thumbnailEmpty}>?</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Error upload ───────────────────────────────── */}
      {uploadError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠ {uploadError}</Text>
        </View>
      ) : null}

      {/* ── Hasil upload: ada pose gagal ───────────────── */}
      {uploadResult && hasFailures && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>⚠ Beberapa foto perlu diulang</Text>
          {captures
            .filter((c) => c.ok === false)
            .map((c) => (
              <Text key={c.pose} style={styles.resultItem}>
                • {c.pose}: {friendlyReason(c.reason ?? '')}
              </Text>
            ))}
          <Text style={styles.resultHint}>
            Ketuk pose merah di atas untuk mengambil ulang, lalu{' '}
            <Text onPress={handleRetake} style={styles.retakeLink}>
              ketuk di sini
            </Text>{' '}
            atau tekan Kirim Ulang.
          </Text>
        </View>
      )}

      {/* ── Tombol Upload / Kirim Ulang ────────────────── */}
      {allCaptured && !allOk && (
        <TouchableOpacity
          style={[styles.uploadButton, isUploading && styles.buttonDisabled]}
          onPress={handleUpload}
          disabled={isUploading}
          activeOpacity={0.8}
        >
          {isUploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.uploadButtonText}>
              {uploadResult ? '🔄 Kirim Ulang (5 Foto)' : '☁️ Kirim ke Server'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* ── Tombol Hapus Data Wajah ────────────────────── */}
      <TouchableOpacity
        style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
        onPress={handleDeleteFace}
        disabled={isDeleting}
        activeOpacity={0.8}
      >
        {isDeleting ? (
          <ActivityIndicator color="#dc2626" />
        ) : (
          <Text style={styles.deleteButtonText}>🗑 Hapus Data Wajah</Text>
        )}
      </TouchableOpacity>

      {/* ── Reset ──────────────────────────────────────── */}
      <TouchableOpacity style={styles.resetLink} onPress={reset}>
        <Text style={styles.resetLinkText}>Mulai Ulang dari Awal</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function friendlyReason(reason: string): string {
  const map: Record<string, string> = {
    NO_FACE: 'Wajah tidak terdeteksi',
    MULTIPLE_FACES: 'Lebih dari 1 wajah',
    FACE_TOO_SMALL: 'Wajah terlalu kecil',
    IMAGE_BLURRY: 'Gambar buram',
  };
  return map[reason] ?? reason;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f6fa' },
  content: { paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f5f6fa',
  },
  // ── Permission ──
  permTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 10, textAlign: 'center' },
  permDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  permButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  permButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // ── Success ──
  successBg: { backgroundColor: '#f0fdf4' },
  successIcon: { fontSize: 56, marginBottom: 12 },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#16a34a', marginBottom: 8 },
  successSub: { fontSize: 14, color: '#374151', marginBottom: 32, textAlign: 'center' },
  doneButton: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  doneButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  // ── Guide ──
  guideSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  sectionSub: { fontSize: 12, color: '#6b7280', marginBottom: 8, lineHeight: 18 },
  // ── Active pose bar ──
  activePoseBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  activePoseLabel: { fontSize: 13, color: '#6b7280' },
  activePoseName: { fontSize: 15, fontWeight: '700', color: '#1d4ed8', flex: 1 },
  activePoseHint: { fontSize: 13, color: '#93c5fd' },
  // ── Camera ──
  cameraContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
    height: 320,
    backgroundColor: '#000',
    position: 'relative',
  },
  camera: { flex: 1 },
  ovalOverlay: {
    position: 'absolute',
    top: '10%',
    left: '15%',
    right: '15%',
    bottom: '10%',
    borderRadius: 200,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderStyle: 'dashed',
  },
  // ── Capture button ──
  captureButton: {
    backgroundColor: '#2563eb',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  captureButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  // ── Thumbnails ──
  thumbnailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginTop: 12,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailActive: { borderColor: '#2563eb' },
  thumbnailFailed: { borderColor: '#dc2626' },
  thumbnailImage: { width: '100%', height: '100%' },
  thumbnailEmpty: { fontSize: 20, color: '#d1d5db' },
  // ── Error / Result ──
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
  resultBox: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
  },
  resultTitle: { fontWeight: '700', color: '#92400e', marginBottom: 8 },
  resultItem: { color: '#78350f', fontSize: 13, marginBottom: 4 },
  resultHint: { fontSize: 12, color: '#92400e', marginTop: 6, fontStyle: 'italic' },
  // ── Upload button ──
  uploadButton: {
    backgroundColor: '#2563eb',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  uploadButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  // ── Delete button ──
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#dc2626',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  deleteButtonText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
  buttonDisabled: { opacity: 0.6 },
  // ── Reset ──
  resetLink: { alignItems: 'center', marginTop: 16, padding: 8 },
  resetLinkText: { color: '#6b7280', fontSize: 13, textDecorationLine: 'underline' },
  retakeLink: { color: '#2563eb', textDecorationLine: 'underline', fontWeight: '600' },
});
