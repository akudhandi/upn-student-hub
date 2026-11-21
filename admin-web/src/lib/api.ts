import axios from 'axios';
import { clearAdminSession, getAdminToken } from '@/lib/auth';

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getAdminToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const reqUrl = String(error?.config?.url || '');
    if (
      status === 401 &&
      typeof window !== 'undefined' &&
      !reqUrl.includes('/admin/auth/login')
    ) {
      clearAdminSession();
    }
    return Promise.reject(error);
  },
);

export interface AdminErrorOptions {
  statusMessages?: Partial<Record<number, string>>;
  networkMessage?: string;
}

export function isAbortError(err: unknown): boolean {
  if (axios.isCancel(err)) return true;
  if (axios.isAxiosError(err) && err.code === 'ERR_CANCELED') return true;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  return false;
}

export function extractAdminError(
  err: unknown,
  fallback: string,
  options?: AdminErrorOptions,
): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status !== undefined && options?.statusMessages?.[status]) {
      return options.statusMessages[status];
    }
    const data = err.response?.data as
      | { message?: string; errors?: Record<string, string[] | string> }
      | undefined;
    if (data?.errors) {
      const first = Object.values(data.errors)
        .flat()
        .find((item) => typeof item === 'string' && item.trim().length > 0);
      if (first) return first;
    }
    if (typeof data?.message === 'string' && data.message.trim().length > 0) {
      return data.message;
    }
    if (!err.response) {
      return (
        options?.networkMessage ??
        'Tidak dapat menghubungi server. Pastikan backend berjalan.'
      );
    }
  }
  return fallback;
}

export default api;
