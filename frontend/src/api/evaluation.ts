import { apiClient } from './client';
import type {
  EvaluationTrial,
  EvaluationSummary,
} from './types';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Daftar percobaan evaluasi (bisa filter per skenario). */
export async function getEvaluationTrials(scenario?: string): Promise<EvaluationTrial[]> {
  const res = await apiClient.get<EvaluationTrial[]>('/evaluation/trials', {
    params: scenario ? { scenario } : undefined,
  });
  return res.data;
}

/** Hapus satu percobaan evaluasi. */
export async function deleteEvaluationTrial(id: number): Promise<void> {
  await apiClient.delete(`/evaluation/trials/${id}`);
}

/** Ringkasan FAR/FRR. */
export async function getEvaluationSummary(): Promise<EvaluationSummary> {
  const res = await apiClient.get<EvaluationSummary>('/evaluation/summary');
  return res.data;
}

/** Unduh CSV evaluasi dan bagikan via expo-sharing. */
export async function exportEvaluationCSV(): Promise<void> {
  const res = await apiClient.get<string>('/evaluation/export.csv', {
    responseType: 'text',
  });
  // SDK 58: gunakan File + Paths (bukan FileSystem legacy)
  const file = new File(Paths.document, 'evaluasi.csv');
  await file.write(res.data);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Ekspor Data Evaluasi',
    });
  }
}
