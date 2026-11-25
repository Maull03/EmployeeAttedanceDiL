import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const KEY_AUTH_TOKEN = 'auth_token';

interface AuthState {
  token: string | null;
  username: string | null;

  /** Simpan token dan username ke state dan SecureStore. */
  setToken: (token: string, username: string) => Promise<void>;

  /** Hapus token dan username dari state dan SecureStore. */
  clearToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  username: null,

  setToken: async (token: string, username: string) => {
    await SecureStore.setItemAsync(KEY_AUTH_TOKEN, token);
    set({ token, username });
  },

  clearToken: async () => {
    await SecureStore.deleteItemAsync(KEY_AUTH_TOKEN);
    set({ token: null, username: null });
  },
}));
