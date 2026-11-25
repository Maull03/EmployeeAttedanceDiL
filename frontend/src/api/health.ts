import { apiClient } from './client';
import type { HealthResponse } from './types';

export const getHealth = () =>
  apiClient.get<HealthResponse>('/health').then((r) => r.data);
