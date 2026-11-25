import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';

import { getHealth } from '@/api/health';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import type { HealthResponse } from '@/api/types';

export default function SettingsScreen() {
  const username = useAuthStore((s) => s.username);
  const clearToken = useAuthStore((s) => s.clearToken);
  const { baseUrl, deviceKey, setBaseUrl, setDeviceKey } = useSettingsStore();

  const [urlInput, setUrlInput] = useState(baseUrl);
  const [keyInput, setKeyInput] = useState(deviceKey);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setBaseUrl(urlInput.trim());
      await setDeviceKey(keyInput.trim());
      Alert.alert('Tersimpan', 'Pengaturan berhasil disimpan.');
    } catch {
      Alert.alert('Error', 'Gagal menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setHealthData(null);
    setHealthError(null);
    try {
      const data = await getHealth();
      setHealthData(data);
    } catch {
      setHealthError('Gagal terhubung ke server. Periksa URL dan koneksi.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Apakah Anda yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await clearToken();
          router.replace('/admin/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Pengaturan</Text>

      {/* Server Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Koneksi Server</Text>

        <Text style={styles.label}>URL Server</Text>
        <TextInput
          style={styles.input}
          value={urlInput}
          onChangeText={setUrlInput}
          placeholder="http://192.168.1.10:8000/api/v1"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <Text style={[styles.label, styles.labelGap]}>Device Key</Text>
        <TextInput
          style={styles.input}
          value={keyInput}
          onChangeText={setKeyInput}
          placeholder="device-key"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.button, isSaving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Simpan</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineButton, isTesting && styles.buttonDisabled]}
          onPress={handleTestConnection}
          disabled={isTesting}
          activeOpacity={0.8}
        >
          {isTesting ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <Text style={styles.outlineButtonText}>Tes Koneksi</Text>
          )}
        </TouchableOpacity>

        {/* Health result */}
        {healthData ? (
          <View style={styles.healthBox}>
            <Text style={styles.healthTitle}>✅ Server OK</Text>
            <Text style={styles.healthRow}>Status: {healthData.status}</Text>
            <Text style={styles.healthRow}>
              YOLO: {healthData.models.yolo ? '✔' : '✗'} · Landmark: {healthData.models.landmarks ? '✔' : '✗'} · FaceNet: {healthData.models.facenet ? '✔' : '✗'}
            </Text>
            <Text style={styles.healthRow}>
              Karyawan terdaftar: {healthData.registered_employees}
            </Text>
          </View>
        ) : healthError ? (
          <View style={[styles.healthBox, styles.healthError]}>
            <Text style={styles.healthErrorText}>{healthError}</Text>
          </View>
        ) : null}
      </View>

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Akun Admin</Text>
        <View style={styles.accountRow}>
          <Text style={styles.accountLabel}>Username</Text>
          <Text style={styles.accountValue}>{username ?? '-'}</Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  content: { padding: 16, paddingBottom: 40 },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 48,
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 14,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  labelGap: { marginTop: 14 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 18,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  buttonDisabled: { opacity: 0.6 },
  outlineButton: {
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  outlineButtonText: { color: '#2563eb', fontWeight: '700', fontSize: 15 },
  healthBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 4,
  },
  healthError: { backgroundColor: '#fef2f2' },
  healthTitle: { fontWeight: '700', color: '#16a34a', fontSize: 14 },
  healthRow: { fontSize: 13, color: '#374151' },
  healthErrorText: { color: '#dc2626', fontSize: 14 },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  accountLabel: { fontSize: 14, color: '#6b7280' },
  accountValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  logoutButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  logoutText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
});
