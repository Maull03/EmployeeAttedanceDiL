import { Stack, router } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/store/auth';

export default function AdminLayout() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (!token) {
      router.replace('/admin/login');
    }
  }, [token]);

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="employees/new"
        options={{ title: 'Tambah Karyawan', headerShown: true }}
      />
      <Stack.Screen
        name="employees/[id]"
        options={{ title: 'Detail Karyawan', headerShown: true }}
      />
      <Stack.Screen
        name="employees/[id]/register-face"
        options={{ title: 'Registrasi Wajah', headerShown: true }}
      />
    </Stack>
  );
}
