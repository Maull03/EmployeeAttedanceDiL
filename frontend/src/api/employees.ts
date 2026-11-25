import { apiClient } from './client';
import type {
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  RegisterFaceResponse,
  FaceInfoResponse,
} from './types';

/** Ambil daftar karyawan, dengan filter opsional. */
export async function getEmployees(params?: {
  search?: string;
  active?: boolean;
}): Promise<Employee[]> {
  const response = await apiClient.get<Employee[]>('/employees', { params });
  return response.data;
}

/** Buat karyawan baru. */
export async function createEmployee(
  data: CreateEmployeeRequest,
): Promise<Employee> {
  const response = await apiClient.post<Employee>('/employees', data);
  return response.data;
}

/** Ambil detail satu karyawan berdasarkan ID internal (number). */
export async function getEmployee(id: number): Promise<Employee> {
  const response = await apiClient.get<Employee>(`/employees/${id}`);
  return response.data;
}

/** Update sebagian data karyawan. */
export async function updateEmployee(
  id: number,
  data: UpdateEmployeeRequest,
): Promise<Employee> {
  const response = await apiClient.patch<Employee>(`/employees/${id}`, data);
  return response.data;
}

/** Deaktivasi (soft-delete) karyawan. */
export async function deactivateEmployee(id: number): Promise<void> {
  await apiClient.delete(`/employees/${id}`);
}

/**
 * Daftarkan wajah karyawan menggunakan multipart FormData.
 *
 * @param id      ID karyawan (integer)
 * @param images  Array objek { uri, pose } — uri adalah path file lokal
 * @param replace Jika true, hapus data wajah lama sebelum mendaftar
 */
export async function registerFace(
  id: number,
  images: { uri: string; pose: string }[],
  replace = false,
): Promise<RegisterFaceResponse> {
  const formData = new FormData();

  for (const image of images) {
    // React Native FormData menerima objek { uri, name, type }
    formData.append('images[]', {
      uri: image.uri,
      name: `face_${image.pose}.jpg`,
      type: 'image/jpeg',
    } as unknown as Blob);
    formData.append('poses[]', image.pose);
  }

  formData.append('replace', String(replace));

  const response = await apiClient.post<RegisterFaceResponse>(
    `/employees/${id}/face`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return response.data;
}

/** Ambil informasi wajah yang sudah terdaftar untuk karyawan. */
export async function getFaceInfo(id: number): Promise<FaceInfoResponse> {
  const response = await apiClient.get<FaceInfoResponse>(`/employees/${id}/face`);
  return response.data;
}

/** Hapus semua data wajah karyawan. */
export async function deleteFace(id: number): Promise<void> {
  await apiClient.delete(`/employees/${id}/face`);
}
