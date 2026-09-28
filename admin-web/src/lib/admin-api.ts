import api from '@/lib/api';
import type { AdminUser } from '@/lib/auth';

export interface AdminLoginResponse {
  message: string;
  token: string;
  admin: AdminUser;
}

export interface DashboardCounts {
  users: number;
  marketplace: number;
  services: number;
  kost: number;
  lost_found: number;
  events: number;
}

export interface DashboardNeedsAttention {
  pending_reports: number;
  reported_listings: number;
  reported_users: number;
  pending_events: number;
}

export interface RecentUser {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at: string;
  profile?: {
    user_id: number;
    nim?: string;
    name?: string;
    faculty?: string;
  } | null;
}

export interface RecentListing {
  id: number;
  title: string;
  price: number | string;
  status: string;
  user_id: number;
  created_at: string;
  user?: { id: number; name: string } | null;
}

export interface RecentReport {
  id: number;
  reportable_type: string;
  reportable_id: number;
  reason: string;
  status: string;
  reporter_id: number;
  created_at: string;
  reporter?: { id: number; name: string } | null;
}

export interface RecentEvent {
  id: number;
  title: string;
  status: string;
  event_date?: string | null;
  created_at: string;
}

export interface DashboardStats {
  users_count: number;
  active_listings: number;
  pending_events_count: number;
  pending_reports_count: number;
  counts: DashboardCounts;
  needs_attention: DashboardNeedsAttention;
  recent_activity: {
    users: RecentUser[];
    marketplace: RecentListing[];
    reports: RecentReport[];
    events: RecentEvent[];
  };
}

export async function adminLogin(
  email: string,
  password: string,
): Promise<AdminLoginResponse> {
  const { data } = await api.post<AdminLoginResponse>('/admin/auth/login', {
    email,
    password,
  });
  return data;
}

export async function adminLogout(): Promise<void> {
  await api.post('/admin/auth/logout');
}

export async function getAdminStats(): Promise<DashboardStats> {
  const { data } = await api.get<{ message: string; data: DashboardStats }>(
    '/admin/stats',
  );
  return data.data;
}

export async function getAdminProfile(): Promise<AdminUser> {
  const { data } = await api.get<{ data: AdminUser } | AdminUser>(
    '/admin/profile',
  );
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: AdminUser }).data;
  }
  return data as AdminUser;
}
