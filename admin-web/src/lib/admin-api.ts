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

export async function downloadAdminCsv(
  path: string,
  params: Record<string, string | number | undefined>,
  fallbackFilename: string,
): Promise<void> {
  const response = await api.get<Blob>(path, {
    params,
    responseType: 'blob',
  });
  const disposition = response.headers['content-disposition'] as
    | string
    | undefined;
  const match = disposition?.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || fallbackFilename;

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ListingImageRef {
  id: number;
  file_path: string;
  sort_order: number;
}

export interface CategoryRef {
  id: number;
  name: string;
  slug: string;
}

export interface UserRef {
  id: number;
  name: string;
  email?: string;
}

// ---------------------------------------------------------------------------
// Marketplace
// ---------------------------------------------------------------------------

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
  user?: UserRef | null;
  category?: CategoryRef | null;
  images?: ListingImageRef[];
  reports_count?: number;
}

export type ListingAction = 'hide' | 'restore' | 'delete';

export async function getAdminMarketplace(params: {
  page?: number;
  status?: string;
  search?: string;
  category_id?: number;
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

// ---------------------------------------------------------------------------
// Services (Jasa Mahasiswa)
// ---------------------------------------------------------------------------

export interface ServiceListingItem {
  id: number;
  user_id: number;
  category_id: number | null;
  title: string;
  description: string;
  price_min: number | string;
  price_max: number | string | null;
  pricing_type?: string | null;
  estimated_time?: string | null;
  payment_method?: string | null;
  whatsapp_number?: string | null;
  target_faculties?: string[] | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user?: UserRef | null;
  category?: CategoryRef | null;
  images?: ListingImageRef[];
  reports_count?: number;
}

export async function getAdminServices(params: {
  page?: number;
  status?: string;
  search?: string;
  category_id?: number;
}): Promise<Paginated<ServiceListingItem>> {
  const { data } = await api.get<{
    message: string;
    data: Paginated<ServiceListingItem>;
  }>('/admin/services', { params });
  return data.data;
}

export async function updateServiceStatus(
  id: number,
  action: ListingAction,
): Promise<ServiceListingItem> {
  const { data } = await api.patch<{
    message: string;
    data: ServiceListingItem;
  }>(`/admin/services/${id}/status`, { action });
  return data.data;
}

// ---------------------------------------------------------------------------
// Lost & Found
// ---------------------------------------------------------------------------

export type LostFoundTab = 'all' | 'lost' | 'found' | 'resolved';
export type LostFoundAction = 'hide' | 'restore' | 'mark_resolved' | 'delete';

export interface LostFoundItem {
  id: number;
  user_id: number;
  type: 'lost' | 'found' | string;
  title: string;
  category_id: number | null;
  description: string;
  location: string;
  date_event?: string | null;
  contact_info?: string | null;
  reward?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user?: UserRef | null;
  category?: CategoryRef | null;
  images?: ListingImageRef[];
  reports_count?: number;
}

export async function getAdminLostFound(params: {
  page?: number;
  tab?: LostFoundTab;
  status?: string;
  search?: string;
  category_id?: number;
}): Promise<Paginated<LostFoundItem>> {
  const { data } = await api.get<{
    message: string;
    data: Paginated<LostFoundItem>;
  }>('/admin/lost-found', { params });
  return data.data;
}

export async function updateLostFoundStatus(
  id: number,
  action: LostFoundAction,
): Promise<LostFoundItem> {
  const { data } = await api.patch<{
    message: string;
    data: LostFoundItem;
  }>(`/admin/lost-found/${id}/status`, { action });
  return data.data;
}

// ---------------------------------------------------------------------------
// Event & Informasi Kampus
// ---------------------------------------------------------------------------

export type EventStatus =
  | 'draft'
  | 'pending'
  | 'published'
  | 'rejected'
  | 'archived';

export interface AdminEventItem {
  id: number;
  user_id: number;
  title: string;
  slug: string;
  event_code?: string | null;
  category_id: number | null;
  organizer_name: string;
  event_date: string;
  event_time?: string | null;
  location: string;
  registration_link?: string | null;
  description: string;
  status: EventStatus | string;
  created_at: string;
  updated_at: string;
  user?: UserRef | null;
  category?: CategoryRef | null;
  images?: ListingImageRef[];
}

export interface AdminEventInput {
  title: string;
  category_id?: number | null;
  organizer_name: string;
  event_date: string;
  event_time?: string | null;
  location: string;
  registration_link?: string | null;
  description: string;
  status?: EventStatus;
  image_paths?: string[];
}

export async function uploadAdminMedia(
  file: File,
  folder: 'events' | 'listings' | 'avatars' = 'events',
): Promise<{ path: string; url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const { data } = await api.post<{
    message: string;
    data: { path: string; url: string };
  }>('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function getAdminEvents(params: {
  page?: number;
  status?: string;
  search?: string;
  category_id?: number;
}): Promise<Paginated<AdminEventItem>> {
  const { data } = await api.get<{
    message: string;
    data: Paginated<AdminEventItem>;
  }>('/admin/events', { params });
  return data.data;
}

export async function getAdminEvent(id: number | string): Promise<AdminEventItem> {
  const { data } = await api.get<{
    message: string;
    data: AdminEventItem;
  }>(`/admin/events/${id}`);
  return data.data;
}

export async function createAdminEvent(
  input: AdminEventInput,
): Promise<AdminEventItem> {
  const { data } = await api.post<{
    message: string;
    data: AdminEventItem;
  }>('/admin/events', input);
  return data.data;
}

export async function updateAdminEvent(
  id: number | string,
  input: AdminEventInput,
): Promise<AdminEventItem> {
  const { data } = await api.put<{
    message: string;
    data: AdminEventItem;
  }>(`/admin/events/${id}`, input);
  return data.data;
}

export async function deleteAdminEvent(id: number): Promise<void> {
  await api.delete(`/admin/events/${id}`);
}

export async function updateAdminEventStatus(
  id: number,
  status: EventStatus,
  rejectionReason?: string,
): Promise<AdminEventItem> {
  const { data } = await api.patch<{
    message: string;
    data: AdminEventItem;
  }>(`/admin/events/${id}/status`, {
    status,
    rejection_reason: rejectionReason || undefined,
  });
  return data.data;
}

// ---------------------------------------------------------------------------
// Categories (Master Data)
// ---------------------------------------------------------------------------

export type CategoryType = 'marketplace' | 'service' | 'lost_found' | 'event';

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  type: string;
  is_active: boolean;
  created_at?: string;
}

export async function getAdminCategories(params?: {
  page?: number;
  type?: CategoryType;
}): Promise<Paginated<CategoryItem>> {
  const { data } = await api.get<{
    message: string;
    data: Paginated<CategoryItem>;
  }>('/admin/categories', { params });
  return data.data;
}

export async function createAdminCategory(input: {
  name: string;
  type: CategoryType;
}): Promise<CategoryItem> {
  const { data } = await api.post<{
    message: string;
    data: CategoryItem;
  }>('/admin/categories', input);
  return data.data;
}

export async function updateAdminCategory(
  id: number,
  input: { name?: string; type?: CategoryType },
): Promise<CategoryItem> {
  const { data } = await api.put<{
    message: string;
    data: CategoryItem;
  }>(`/admin/categories/${id}`, input);
  return data.data;
}

export async function deleteAdminCategory(id: number): Promise<void> {
  await api.delete(`/admin/categories/${id}`);
}

export async function toggleAdminCategory(id: number): Promise<CategoryItem> {
  const { data } = await api.patch<{
    message: string;
    data: CategoryItem;
  }>(`/admin/categories/${id}/toggle`);
  return data.data;
}

// ---------------------------------------------------------------------------
// Announcements (Notifikasi Sistem)
// ---------------------------------------------------------------------------

export interface AnnouncementItem {
  id: number;
  title: string;
  message: string;
  target_role: 'all' | 'student' | string;
  admin_id?: number | null;
  created_at: string;
  admin?: { id: number; email: string } | null;
}

export async function getAdminAnnouncements(params?: {
  page?: number;
}): Promise<Paginated<AnnouncementItem>> {
  const { data } = await api.get<{
    message: string;
    data: Paginated<AnnouncementItem>;
  }>('/admin/announcements', { params });
  return data.data;
}

export async function createAdminAnnouncement(input: {
  title: string;
  message: string;
  target_role: 'all' | 'student';
}): Promise<AnnouncementItem> {
  const { data } = await api.post<{
    message: string;
    data: AnnouncementItem;
  }>('/admin/announcements', input);
  return data.data;
}

export async function deleteAdminAnnouncement(id: number): Promise<void> {
  await api.delete(`/admin/announcements/${id}`);
}

// ---------------------------------------------------------------------------
// Users Management
// ---------------------------------------------------------------------------

export type UserStatus = 'active' | 'suspended' | 'banned' | 'inactive';

export interface StudentProfileInfo {
  user_id?: number;
  nim?: string | null;
  name?: string | null;
  faculty?: string | null;
  bio?: string | null;
  avatar?: string | null;
}

export interface AdminUserItem {
  id: number;
  name: string;
  email: string;
  status: UserStatus | string;
  created_at: string;
  profile?: StudentProfileInfo | null;
}

export interface UserReportHistoryItem {
  id: number;
  reportable_type: string;
  reportable_id: number;
  reason: string;
  status: string;
  created_at: string;
  reporter?: { id: number; name: string } | null;
}

export interface AdminUserDetail {
  user: AdminUserItem;
  listings_count: number;
  reports_history: UserReportHistoryItem[];
}

export async function getAdminUsers(params: {
  page?: number;
  status?: string;
  search?: string;
  faculty?: string;
}): Promise<Paginated<AdminUserItem>> {
  const { data } = await api.get<{
    message: string;
    data: Paginated<AdminUserItem>;
  }>('/admin/users', { params });
  return data.data;
}

export async function getAdminUserDetail(id: number): Promise<AdminUserDetail> {
  const { data } = await api.get<{
    message: string;
    data: AdminUserDetail;
  }>(`/admin/users/${id}`);
  return data.data;
}

export async function updateAdminUserStatus(
  id: number,
  status: UserStatus,
): Promise<AdminUserItem> {
  const { data } = await api.patch<{
    message: string;
    data: AdminUserItem;
  }>(`/admin/users/${id}/status`, { status });
  return data.data;
}

// ---------------------------------------------------------------------------
// Reports & Moderation
// ---------------------------------------------------------------------------

export type ReportStatus =
  | 'pending'
  | 'reviewing'
  | 'resolved'
  | 'rejected'
  | 'dismissed';

export type ReportTargetAction =
  | 'none'
  | 'hide_content'
  | 'delete_content'
  | 'suspend_user'
  | 'ban_user';

export interface ReportableTarget {
  id: number;
  title?: string;
  name?: string;
  email?: string;
  status?: string;
}

export interface AdminReportItem {
  id: number;
  reporter_id: number;
  reportable_type: string;
  reportable_id: number;
  reason: string;
  description?: string | null;
  status: ReportStatus | string;
  resolved_by?: number | null;
  created_at: string;
  reporter?: UserRef | null;
  reportable?: ReportableTarget | null;
}

export async function getAdminReports(params: {
  page?: number;
  status?: string;
  search?: string;
  reportable_type?: string;
}): Promise<Paginated<AdminReportItem>> {
  const { data } = await api.get<{
    message: string;
    data: Paginated<AdminReportItem>;
  }>('/admin/reports', { params });
  return data.data;
}

export async function resolveAdminReport(
  id: number,
  input: { status: Exclude<ReportStatus, 'pending'>; target_action?: ReportTargetAction },
): Promise<AdminReportItem> {
  const { data } = await api.patch<{
    message: string;
    data: AdminReportItem;
  }>(`/admin/reports/${id}/resolve`, input);
  return data.data;
}

// ---------------------------------------------------------------------------
// Settings & System Status
// ---------------------------------------------------------------------------

export interface SystemStatusData {
  app_time: string;
  database: 'connected' | 'disconnected' | string;
  storage_writable: boolean;
  totals: {
    users: number;
    marketplace: number;
    services: number;
    lost_found: number;
    events: number;
    reports_pending: number;
  };
}

export async function getAdminSystemStatus(): Promise<SystemStatusData> {
  const { data } = await api.get<{
    message: string;
    data: SystemStatusData;
  }>('/admin/system-status');
  return data.data;
}

export async function updateAdminPassword(input: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  await api.patch('/admin/profile/password', input);
}

// ---------------------------------------------------------------------------
// Admin Accounts (Superadmin Only)
// ---------------------------------------------------------------------------

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
