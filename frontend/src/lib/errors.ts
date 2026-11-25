import { isAxiosError } from 'axios';

/**
 * Ekstrak pesan error yang bisa dibaca manusia dari berbagai tipe error.
 * Prioritas: axios response detail → axios response message → error message → fallback
 */
export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    // Cek field `detail` dari response body (FastAPI / backend standar)
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.length > 0) {
      return detail;
    }
    // Cek field `message` dari response body
    const responseMessage = error.response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage.length > 0) {
      return responseMessage;
    }
    // Gunakan message dari error axios itu sendiri
    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string' && error.length > 0) {
    return error;
  }

  return 'Terjadi kesalahan. Silakan coba lagi.';
}
