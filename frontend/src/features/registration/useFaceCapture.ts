/**
 * useFaceCapture — hook untuk mengelola state 5 pose registrasi wajah.
 *
 * Aturan teknis:
 * - Saat retake pose gagal, tetap kirim ulang SELURUH 5 foto (gabungan foto
 *   lama yang valid + foto baru) dengan replace=true.
 */
import { useCallback, useRef, useState } from 'react';
import { File } from 'expo-file-system';
import type { CameraView } from 'expo-camera';

import { registerFace } from '@/api/employees';
import type { FaceRegistrationResult, RegisterFaceResponse } from '@/api/types';

export type PoseName =
  | 'Depan'
  | 'Sedikit ke kiri'
  | 'Sedikit ke kanan'
  | 'Sedikit ke atas'
  | 'Sedikit ke bawah';

export const POSES: PoseName[] = [
  'Depan',
  'Sedikit ke kiri',
  'Sedikit ke kanan',
  'Sedikit ke atas',
  'Sedikit ke bawah',
];

export interface PoseCapture {
  pose: PoseName;
  uri: string | null;
  /** null = belum divalidasi server, true = OK, false = gagal */
  ok: boolean | null;
  reason?: string;
}

interface UseFaceCaptureReturn {
  captures: PoseCapture[];
  activePoseIndex: number;
  isUploading: boolean;
  uploadResult: RegisterFaceResponse | null;
  uploadError: string | null;
  /** Ambil foto untuk pose saat ini */
  capturePhoto: (cameraRef: React.RefObject<CameraView | null>) => Promise<void>;
  /** Pindah ke pose tertentu (untuk retake) */
  setActivePose: (index: number) => void;
  /** Upload semua 5 foto ke server */
  uploadAll: (employeeId: number) => Promise<void>;
  /** Reset untuk mulai ulang dari awal */
  reset: () => void;
  allCaptured: boolean;
}

function makeInitialCaptures(): PoseCapture[] {
  return POSES.map((pose) => ({ pose, uri: null, ok: null }));
}

export function useFaceCapture(): UseFaceCaptureReturn {
  const [captures, setCaptures] = useState<PoseCapture[]>(makeInitialCaptures);
  const [activePoseIndex, setActivePoseIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<RegisterFaceResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Simpan URI foto lama yang valid agar tidak terhapus saat retake pose lain
  const prevUrisRef = useRef<Map<number, string>>(new Map());

  const allCaptured = captures.every((c) => c.uri !== null);

  const capturePhoto = useCallback(
    async (cameraRef: React.RefObject<CameraView | null>) => {
      if (!cameraRef.current) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        if (!photo?.uri) return;

        setCaptures((prev) => {
          const next = [...prev];
          // Hapus URI lama pose ini jika ada (file sementara)
          const oldUri = next[activePoseIndex].uri;
          if (oldUri && !prevUrisRef.current.has(activePoseIndex)) {
            // akan dihapus nanti setelah upload selesai
          }
          next[activePoseIndex] = {
            ...next[activePoseIndex],
            uri: photo.uri,
            ok: null,
            reason: undefined,
          };
          return next;
        });

        // Otomatis pindah ke pose berikutnya jika bukan pose terakhir
        setActivePoseIndex((prev) => {
          const nextPoses = prev + 1;
          return nextPoses < POSES.length ? nextPoses : prev;
        });
      } catch {
        // ignore camera error
      }
    },
    [activePoseIndex],
  );

  const uploadAll = useCallback(
    async (employeeId: number) => {
      if (!allCaptured) return;
      setIsUploading(true);
      setUploadError(null);
      setUploadResult(null);

      try {
        const images = captures.map((c) => ({
          uri: c.uri as string,
          pose: c.pose,
        }));

        // Selalu kirim replace=true sesuai aturan teknis
        const result = await registerFace(employeeId, images, true);
        setUploadResult(result);

        // Tandai pose mana yang gagal berdasarkan hasil server
        setCaptures((prev) =>
          prev.map((cap, i) => {
            const serverResult: FaceRegistrationResult | undefined = result.results[i];
            if (serverResult) {
              return {
                ...cap,
                ok: serverResult.ok,
                reason: serverResult.reason,
              };
            }
            return cap;
          }),
        );
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { detail?: string } } })?.response?.data
            ?.detail ?? 'Gagal mengunggah foto. Periksa koneksi server.';
        setUploadError(msg);
      } finally {
        setIsUploading(false);
      }
    },
    [allCaptured, captures],
  );

  const setActivePose = useCallback((index: number) => {
    setActivePoseIndex(index);
  }, []);

  const reset = useCallback(() => {
    // Hapus semua file sementara (SDK 58: new File(uri).delete())
    setCaptures((prev) => {
      prev.forEach((c) => {
        if (c.uri) {
          try { new File(c.uri).delete(); } catch { /* ignore */ }
        }
      });
      return makeInitialCaptures();
    });
    prevUrisRef.current.clear();
    setActivePoseIndex(0);
    setUploadResult(null);
    setUploadError(null);
  }, []);

  return {
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
  };
}
