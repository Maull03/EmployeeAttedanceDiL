/**
 * useScanMachine — state machine untuk alur absensi.
 *
 * State: idle → requestingChallenge → preparing → recording → uploading → result → idle
 *
 * Aturan teknis:
 * - videoQuality '480p', mute: true (tidak butuh izin mikrofon)
 * - File video sementara dihapus setelah diunggah (expo-file-system)
 * - CHALLENGE_EXPIRED → kembali ke idle untuk mulai ulang
 */
import { useCallback, useRef, useState } from 'react';
import { File } from 'expo-file-system';
import type { CameraView } from 'expo-camera';

import { requestChallenge, verifyAttendance } from '@/api/attendance';
import type {
  ChallengeResponse,
  VerifyResponse,
  AttendanceReason,
} from '@/api/types';
import { REASON_MESSAGES } from '@/constants/messages';
import { useTestModeStore } from '@/store/testMode';
export type ScanState =
  | 'idle'
  | 'requestingChallenge'
  | 'preparing'
  | 'recording'
  | 'uploading'
  | 'result';

export type AttendanceType = 'check_in' | 'check_out';

interface ScanMachineState {
  state: ScanState;
  attendanceType: AttendanceType;
  challenge: ChallengeResponse | null;
  verifyResult: VerifyResponse | null;
  errorMessage: string | null;
  countdown: number;
}

interface UseScanMachineReturn extends ScanMachineState {
  /** Mulai proses scan: minta challenge */
  start: (cameraRef: React.RefObject<CameraView | null>, type?: AttendanceType) => void;
  /** Toggle tipe absensi (check_in / check_out) */
  toggleType: () => void;
  /** Batalkan proses dan kembali ke idle */
  cancel: () => void;
  /** Reset ke idle setelah hasil tampil */
  backToIdle: () => void;
  /** Ref untuk countdown recording */
  recordingCountdown: number;
}

export function useScanMachine(attendanceType: AttendanceType = 'check_in'): UseScanMachineReturn {
  const [state, setState] = useState<ScanMachineState>({
    state: 'idle',
    attendanceType,
    challenge: null,
    verifyResult: null,
    errorMessage: null,
    countdown: 3,
  });

  const recordingCountdownRef = useRef(0);
  const [recordingCountdown, setRecordingCountdown] = useState(0);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoUriRef = useRef<string | null>(null);

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(
    (partial?: Partial<ScanMachineState>) => {
      clearCountdown();
      setState((prev) => ({
        ...prev,
        state: 'idle',
        challenge: null,
        verifyResult: null,
        errorMessage: null,
        countdown: 3,
        ...partial,
      }));
    },
    [clearCountdown],
  );

  const toggleType = useCallback(() => {
    setState((prev) => ({
      ...prev,
      attendanceType: prev.attendanceType === 'check_in' ? 'check_out' : 'check_in',
    }));
  }, []);

  const cancel = useCallback(() => {
    // Hapus video sementara jika ada (SDK 58: new File(uri).delete())
    if (videoUriRef.current) {
      try { new File(videoUriRef.current).delete(); } catch { /* ignore */ }
      videoUriRef.current = null;
    }
    reset();
  }, [reset]);

  const backToIdle = useCallback(() => {
    if (videoUriRef.current) {
      try { new File(videoUriRef.current).delete(); } catch { /* ignore */ }
      videoUriRef.current = null;
    }
    reset();
  }, [reset]);

  const start = useCallback(
    (cameraRef: React.RefObject<CameraView | null>) => {
      // ── 1. requestingChallenge ──────────────────────────────
      setState((prev) => ({
        ...prev,
        state: 'requestingChallenge',
        challenge: null,
        verifyResult: null,
        errorMessage: null,
      }));

      // Inject force_kind jika mode pengujian aktif
      const tmState = useTestModeStore.getState();
      const challengePayload = {
        type: state.attendanceType,
        ...(tmState.isActive && tmState.config.force_kind
          ? { force_kind: tmState.config.force_kind }
          : {}),
      };
      requestChallenge(challengePayload)
        .then((challenge) => {
          // ── 2. preparing — hitung mundur 3-2-1 ───────────
          setState((prev) => ({
            ...prev,
            state: 'preparing',
            challenge,
            countdown: 3,
          }));

          let count = 3;
          countdownTimerRef.current = setInterval(() => {
            count -= 1;
            if (count <= 0) {
              clearCountdown();
              // ── 3. recording ───────────────────────────────
              setState((prev) => ({ ...prev, state: 'recording' }));

              const windowSeconds = challenge.window_seconds ?? 5;
              recordingCountdownRef.current = windowSeconds;
              setRecordingCountdown(windowSeconds);

              // Hitung mundur recording bar
              const recTimer = setInterval(() => {
                recordingCountdownRef.current -= 1;
                setRecordingCountdown(recordingCountdownRef.current);
                if (recordingCountdownRef.current <= 0) {
                  clearInterval(recTimer);
                }
              }, 1000);

              // Mulai rekam video — 480p, mute: true (tidak butuh izin mikrofon)
              if (!cameraRef.current) {
                clearInterval(recTimer);
                reset({ errorMessage: 'Kamera tidak tersedia.' });
                return;
              }

              cameraRef.current
                .recordAsync({
                  maxDuration: windowSeconds,
                  // @ts-expect-error – expo-camera SDK 58 videoQuality prop
                  videoQuality: '480p',
                  mute: true,
                })
                .then(async (recording) => {
                  clearInterval(recTimer);
                  if (!recording?.uri) {
                    reset({ errorMessage: 'Rekaman gagal. Silakan ulangi.' });
                    return;
                  }

                  videoUriRef.current = recording.uri;

                  // ── 4. uploading ───────────────────────────
                  setState((prev) => ({ ...prev, state: 'uploading' }));

                  try {
                    // Baca config test mode secara langsung (getState = no hook)
                    const testMode = useTestModeStore.getState();
                    const extraFields = testMode.isActive
                      ? {
                          dry_run: true,
                          scenario: testMode.config.scenario,
                          variant: testMode.config.variant,
                          lighting: testMode.config.lighting,
                          distance_cm: testMode.config.distance_cm,
                          subject_employee_id:
                            testMode.config.subject_employee_id ?? undefined,
                          note: testMode.config.note || undefined,
                        }
                      : undefined;

                    const result = await verifyAttendance(
                      challenge.challenge_id,
                      recording.uri,
                      extraFields,
                    );

                    // Hapus file video setelah upload (D6)
                    try { new File(recording.uri).delete(); } catch { /* ignore */ }
                    videoUriRef.current = null;

                    // Jika challenge kedaluwarsa → mulai ulang
                    if (result.reason === 'CHALLENGE_EXPIRED') {
                      reset({
                        errorMessage: REASON_MESSAGES['CHALLENGE_EXPIRED'],
                      });
                      return;
                    }

                    // ── 5. result ──────────────────────────
                    setState((prev) => ({
                      ...prev,
                      state: 'result',
                      verifyResult: result,
                    }));
                  } catch (err: unknown) {
                    try { new File(recording.uri).delete(); } catch { /* ignore */ }
                    videoUriRef.current = null;

                    const reason = (
                      err as { response?: { data?: { reason?: AttendanceReason } } }
                    )?.response?.data?.reason;
                    const msg = reason
                      ? (REASON_MESSAGES[reason] ?? 'Verifikasi gagal. Silakan ulangi.')
                      : 'Gagal terhubung ke server. Periksa jaringan.';
                    reset({ errorMessage: msg });
                  }
                })
                .catch(() => {
                  clearInterval(recTimer);
                  reset({ errorMessage: 'Rekaman gagal. Silakan ulangi.' });
                });
            } else {
              setState((prev) => ({ ...prev, countdown: count }));
            }
          }, 1000);
        })
        .catch((err: unknown) => {
          const detail = (
            err as { response?: { data?: { detail?: string } } }
          )?.response?.data?.detail;
          reset({
            errorMessage: detail ?? 'Gagal mendapatkan challenge. Periksa koneksi.',
          });
        });
    },
    [state.attendanceType, clearCountdown, reset],
  );

  return {
    ...state,
    start,
    toggleType,
    cancel,
    backToIdle,
    recordingCountdown,
  };
}
