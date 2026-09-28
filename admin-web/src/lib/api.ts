import axios from 'axios';
import { getAdminToken } from '@/lib/auth';

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

export default api;
