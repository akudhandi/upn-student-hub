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

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export type MarketplaceStatus =
  | 'active'
  | 'hidden'
  | 'sold'
  | 'inactive'
  | 'deleted';

export interface MarketplaceListingItem {
  id: number;
  user_id: number;
  category_id: number | null;
  title: string;
  description: string;
  price: number | string;
  condition: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user?: { id: number; name: string } | null;
  category?: { id: number; name: string; slug: string } | null;
  images?: { id: number; file_path: string; sort_order: number }[];
  reports_count?: number;
}

export type ListingAction = 'hide' | 'restore' | 'delete';

export async function getAdminMarketplace(params: {
  page?: number;
  status?: string;
  search?: string;
}): Promise<Paginated<MarketplaceListingItem>> {
  const { data } = await api.get<{
    message: string;
    data: Paginated<MarketplaceListingItem>;
  }>('/admin/marketplace', { params });
  return data.data;
}

export async function updateMarketplaceStatus(
  id: number,
  action: ListingAction,
): Promise<MarketplaceListingItem> {
  const { data } = await api.patch<{
    message: string;
    data: MarketplaceListingItem;
  }>(`/admin/marketplace/${id}/status`, { action });
  return data.data;
}

export interface AdminAccount {
  id: number;
  email: string;
  role: string;
  created_at: string;
}

export async function getAdmins(): Promise<Paginated<AdminAccount>> {
  const { data } = await api.get<{
    message: string;
    data: Paginated<AdminAccount>;
  }>('/admin/admins');
  return data.data;
}

export async function createAdmin(input: {
  email: string;
  password: string;
  role?: string;
}): Promise<AdminAccount> {
  const { data } = await api.post<{
    message: string;
    data: AdminAccount;
  }>('/admin/admins', input);
  return data.data;
}

export async function deleteAdmin(id: number): Promise<void> {
  await api.delete(`/admin/admins/${id}`);
}
