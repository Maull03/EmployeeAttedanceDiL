import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';

import { getEmployee, updateEmployee, deactivateEmployee } from '@/api/employees';
import { EmployeeForm, type EmployeeFormValues } from '@/features/employees/EmployeeForm';

export default function EmployeeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const employeeId = Number(id);
  const queryClient = useQueryClient();

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => getEmployee(employeeId),
    enabled: !isNaN(employeeId),
  });

  const updateMutation = useMutation({
    mutationFn: (data: EmployeeFormValues) =>
      updateEmployee(employeeId, {
        full_name: data.full_name,
        position: data.position,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      Alert.alert('Berhasil', 'Data karyawan diperbarui.');
    },
    onError: () => {
      Alert.alert('Error', 'Gagal memperbarui data karyawan.');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateEmployee(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      router.back();
    },
    onError: () => {
      Alert.alert('Error', 'Gagal menonaktifkan karyawan.');
    },
  });

  const handleDeactivate = () => {
    Alert.alert(
      'Nonaktifkan Karyawan',
      `Apakah Anda yakin ingin menonaktifkan ${employee?.full_name ?? 'karyawan ini'}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Nonaktifkan',
          style: 'destructive',
          onPress: () => deactivateMutation.mutate(),
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (isError || !employee) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Gagal memuat data karyawan.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status badge */}
      {!employee.is_active && (
        <View style={styles.inactiveBanner}>
          <Text style={styles.inactiveBannerText}>⚠ Karyawan Nonaktif</Text>
        </View>
      )}

      {/* Form edit */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informasi Karyawan</Text>
        <EmployeeForm
          defaultValues={employee}
          onSubmit={(data) => updateMutation.mutate(data)}
          loading={updateMutation.isPending}
          isEdit
        />
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.faceButton}
          onPress={() =>
            router.push(
              `/admin/employees/${employeeId}/register-face` as `/admin/employees/${string}/register-face`,
            )
          }
          activeOpacity={0.8}
        >
          <Text style={styles.faceButtonText}>📷 Registrasi Wajah</Text>
        </TouchableOpacity>

        {employee.is_active && (
          <TouchableOpacity
            style={[
              styles.deactivateButton,
              deactivateMutation.isPending && styles.buttonDisabled,
            ]}
            onPress={handleDeactivate}
            disabled={deactivateMutation.isPending}
            activeOpacity={0.8}
          >
            {deactivateMutation.isPending ? (
              <ActivityIndicator color="#dc2626" />
            ) : (
              <Text style={styles.deactivateButtonText}>Nonaktifkan</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  content: { paddingBottom: 40 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: { fontSize: 15, color: '#dc2626', textAlign: 'center' },
  inactiveBanner: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    margin: 16,
    borderRadius: 8,
    padding: 12,
  },
  inactiveBannerText: {
    color: '#dc2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  actions: {
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  faceButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  faceButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  deactivateButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deactivateButtonText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonDisabled: { opacity: 0.5 },
});
