import { apiClient } from './client';
import type { MonthlyReportItem, AttendanceReportItem } from './types';

/** Rekap bulanan: ringkasan per karyawan. */
export async function getMonthlyReport(
  month: string, // format YYYY-MM
): Promise<MonthlyReportItem[]> {
  const res = await apiClient.get<MonthlyReportItem[]>('/reports/monthly', {
    params: { month },
  });
  return res.data;
}

/** Rincian harian absensi per karyawan (atau semua). */
export async function getAttendanceReport(params: {
  date_from?: string;
  date_to?: string;
  employee_id?: number;
}): Promise<AttendanceReportItem[]> {
  const res = await apiClient.get<AttendanceReportItem[]>('/reports/attendance', {
    params,
  });
  return res.data;
}

/** Unduh CSV rekap bulanan sebagai string teks. */
export async function downloadMonthlyCSV(month: string): Promise<string> {
  const res = await apiClient.get<string>('/reports/export.csv', {
    params: { month },
    responseType: 'text',
  });
  return res.data;
}
