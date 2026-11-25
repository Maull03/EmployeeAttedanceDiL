import { create as axiosCreate, isAxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, DEVICE_KEY } from '../lib/env';

// SecureStore keys
const KEY_API_BASE_URL = 'api_base_url';
const KEY_DEVICE_KEY = 'device_key';
const KEY_AUTH_TOKEN = 'auth_token';

// Buat axios instance dengan nilai default dari env
export const apiClient: AxiosInstance = axiosCreate({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    'X-Device-Key': DEVICE_KEY,
  },
});

// ── Request interceptor ──────────────────────────────────────
// Membaca SecureStore secara dinamis pada setiap request,
// sehingga perubahan token / baseURL / deviceKey langsung berlaku.
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const [storedBaseUrl, storedDeviceKey, token] = await Promise.all([
      SecureStore.getItemAsync(KEY_API_BASE_URL),
      SecureStore.getItemAsync(KEY_DEVICE_KEY),
      SecureStore.getItemAsync(KEY_AUTH_TOKEN),
    ]);

    // Override baseURL jika tersimpan di SecureStore
    if (storedBaseUrl) {
      config.baseURL = storedBaseUrl;
    }

    // Set X-Device-Key
    const deviceKey = storedDeviceKey ?? DEVICE_KEY;
    config.headers.set('X-Device-Key', deviceKey);

    // Set Authorization header hanya jika token ada
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers.delete('Authorization');
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ── Response interceptor ─────────────────────────────────────
// Jika respons 401, hapus token yang tersimpan (sesi tidak valid)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      await SecureStore.deleteItemAsync(KEY_AUTH_TOKEN);
    }
    return Promise.reject(error);
  },
);

/**
 * Inisialisasi apiClient secara async.
 * Ambil semua nilai dari SecureStore dan set header default.
 * Panggil ini satu kali saat app pertama kali dimuat (mis. di _layout.tsx).
 * Interceptor request tetap memperbarui header pada setiap request.
 */
export async function initApiClient(): Promise<void> {
  const [storedBaseUrl, storedDeviceKey, token] = await Promise.all([
    SecureStore.getItemAsync(KEY_API_BASE_URL),
    SecureStore.getItemAsync(KEY_DEVICE_KEY),
    SecureStore.getItemAsync(KEY_AUTH_TOKEN),
  ]);

  if (storedBaseUrl) {
    apiClient.defaults.baseURL = storedBaseUrl;
  }

  apiClient.defaults.headers.common['X-Device-Key'] =
    storedDeviceKey ?? DEVICE_KEY;

  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}
