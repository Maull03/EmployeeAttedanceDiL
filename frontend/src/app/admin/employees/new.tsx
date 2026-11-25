import { View, StyleSheet, Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { createEmployee } from '@/api/employees';
import { EmployeeForm, type EmployeeFormValues } from '@/features/employees/EmployeeForm';

export default function NewEmployeeScreen() {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (data: EmployeeFormValues) =>
      createEmployee({
        employee_code: data.employee_code,
        full_name: data.full_name,
        position: data.position ?? '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      router.back();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Gagal menyimpan karyawan.';
      Alert.alert('Error', msg);
    },
  });

  return (
    <View style={styles.container}>
      <EmployeeForm
        onSubmit={(data) => mutate(data)}
        loading={isPending}
        isEdit={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
});
