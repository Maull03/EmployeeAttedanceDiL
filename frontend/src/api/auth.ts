import { apiClient } from './client';
import type { LoginRequest, LoginResponse, AuthMeResponse } from './types';

/**
 * Login dengan username dan password.
 * Mengembalikan access token dan tipe token.
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', data);
  return response.data;
}

/**
 * Mendapatkan informasi pengguna yang sedang login.
 * Memerlukan header Authorization (diset otomatis oleh interceptor).
 */
export async function getMe(): Promise<AuthMeResponse> {
  const response = await apiClient.get<AuthMeResponse>('/auth/me');
  return response.data;
}
