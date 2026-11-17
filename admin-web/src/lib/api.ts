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

export default api;
