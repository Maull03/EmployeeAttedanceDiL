import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Employee } from '@/api/types';

const schema = z.object({
  employee_code: z.string().min(1, 'Kode karyawan wajib diisi'),
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  position: z.string().optional(),
});

export type EmployeeFormValues = z.infer<typeof schema>;

interface EmployeeFormProps {
  defaultValues?: Partial<Employee>;
  onSubmit: (data: EmployeeFormValues) => void;
  loading?: boolean;
  isEdit?: boolean;
}

export function EmployeeForm({
  defaultValues,
  onSubmit,
  loading = false,
  isEdit = false,
}: EmployeeFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employee_code: defaultValues?.employee_code ?? '',
      full_name: defaultValues?.full_name ?? '',
      position: defaultValues?.position ?? '',
    },
  });

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Kode Karyawan */}
      <Text style={styles.label}>Kode Karyawan *</Text>
      <Controller
        control={control}
        name="employee_code"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, errors.employee_code && styles.inputError]}
            placeholder="Contoh: EMP001"
            autoCapitalize="characters"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            editable={!loading && !isEdit}
          />
        )}
      />
      {errors.employee_code ? (
        <Text style={styles.fieldError}>{errors.employee_code.message}</Text>
      ) : null}

      {/* Nama Lengkap */}
      <Text style={[styles.label, styles.labelGap]}>Nama Lengkap *</Text>
      <Controller
        control={control}
        name="full_name"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={[styles.input, errors.full_name && styles.inputError]}
            placeholder="Nama lengkap karyawan"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            editable={!loading}
          />
        )}
      />
      {errors.full_name ? (
        <Text style={styles.fieldError}>{errors.full_name.message}</Text>
      ) : null}

      {/* Jabatan */}
      <Text style={[styles.label, styles.labelGap]}>Jabatan</Text>
      <Controller
        control={control}
        name="position"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Jabatan (opsional)"
            value={value ?? ''}
            onBlur={onBlur}
            onChangeText={onChange}
            editable={!loading}
          />
        )}
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={() => handleSubmit(onSubmit)()}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isEdit ? 'Perbarui' : 'Simpan'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 0 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  labelGap: { marginTop: 16 },
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
  inputError: { borderColor: '#ef4444' },
  fieldError: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
