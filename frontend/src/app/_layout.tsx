import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';

import { initApiClient } from '@/api/client';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  useKeepAwake();
  const [isReady, setIsReady] = useState(false);
  const setToken = useAuthStore((s) => s.setToken);
  const initSettings = useSettingsStore((s) => s.initSettings);

  useEffect(() => {
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    ).catch(() => {
      /* ignore on devices that don't support orientation lock */
    });
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        await initSettings();
        await initApiClient();
        // Restore auth session into Zustand state
        const token = await SecureStore.getItemAsync('auth_token');
        const username = await SecureStore.getItemAsync('auth_username');
        if (token && username) {
          await setToken(token, username);
        }
      } catch (e) {
        console.warn('App init error:', e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
