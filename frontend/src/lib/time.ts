import { format, parseISO } from 'date-fns';

/**
 * Format ISO string ke format tampilan WIB (UTC+7).
 * Karena date-fns tidak mengubah timezone secara otomatis,
 * kita menambahkan offset WIB (+07:00) secara manual ke Date object.
 *
 * Output contoh: "17 Nov 2026 09:30"
 */
export function formatWIB(isoString: string): string {
  const date = parseISO(isoString);

  // Offset WIB = UTC+7 = 7 * 60 menit
  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

  // UTC time in ms
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60 * 1000;

  // Adjust to WIB
  const wibDate = new Date(utcMs + WIB_OFFSET_MS);

  return format(wibDate, 'dd MMM yyyy HH:mm');
}
