import { apiClient } from './client';
import type {
  ChallengeRequest,
  ChallengeResponse,
  VerifyResponse,
  TodayAttendance,
} from './types';

/** Minta challenge dari server sebelum scan. */
export async function requestChallenge(
  data: ChallengeRequest,
): Promise<ChallengeResponse> {
  const res = await apiClient.post<ChallengeResponse>('/attendance/challenge', data);
  return res.data;
}

/**
 * Kirim video ke server untuk verifikasi liveness + pengenalan wajah.
 * @param challengeId  ID challenge dari requestChallenge()
 * @param videoUri     Path file lokal hasil recordAsync()
 * @param extraFields  Field opsional untuk mode pengujian (dry_run, scenario, dll.)
 */
export async function verifyAttendance(
  challengeId: string,
  videoUri: string,
  extraFields?: {
    dry_run?: boolean;
    scenario?: string;
    variant?: string;
    lighting?: string;
    distance_cm?: number;
    subject_employee_id?: number;
    note?: string;
  },
): Promise<VerifyResponse> {
  const formData = new FormData();
  formData.append('challenge_id', challengeId);
  formData.append('video', {
    uri: videoUri,
    name: 'clip.mp4',
    type: 'video/mp4',
  } as unknown as Blob);

  if (extraFields) {
    Object.entries(extraFields).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, String(value));
      }
    });
  }

  const res = await apiClient.post<VerifyResponse>('/attendance/verify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30_000,
  });
  return res.data;
}

/** Status absensi hari ini (opsional untuk layar utama). */
export async function getTodayAttendance(): Promise<TodayAttendance> {
  const res = await apiClient.get<TodayAttendance>('/attendance/today');
  return res.data;
}
