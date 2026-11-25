import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, DEVICE_KEY } from '../lib/env';

const KEY_BASE_URL = 'api_base_url';
const KEY_DEVICE_KEY = 'device_key';

interface SettingsState {
  baseUrl: string;
  deviceKey: string;

  /** Perbarui baseUrl di state dan SecureStore. */
  setBaseUrl: (url: string) => Promise<void>;

  /** Perbarui deviceKey di state dan SecureStore. */
  setDeviceKey: (key: string) => Promise<void>;

  /**
   * Inisialisasi settings dari SecureStore.
   * Panggil satu kali saat app pertama dimuat.
   */
  initSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  baseUrl: API_BASE_URL,
  deviceKey: DEVICE_KEY,

  setBaseUrl: async (url: string) => {
    await SecureStore.setItemAsync(KEY_BASE_URL, url);
    set({ baseUrl: url });
  },

  setDeviceKey: async (key: string) => {
    await SecureStore.setItemAsync(KEY_DEVICE_KEY, key);
    set({ deviceKey: key });
  },

  initSettings: async () => {
    const [storedBaseUrl, storedDeviceKey] = await Promise.all([
      SecureStore.getItemAsync(KEY_BASE_URL),
      SecureStore.getItemAsync(KEY_DEVICE_KEY),
    ]);

    set({
      baseUrl: storedBaseUrl ?? API_BASE_URL,
      deviceKey: storedDeviceKey ?? DEVICE_KEY,
    });
  },
}));
