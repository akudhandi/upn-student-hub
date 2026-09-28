export interface AdminUser {
  id: number;
  name?: string;
  email: string;
  role?: string;
}

const TOKEN_KEY = 'admin_token';
const ADMIN_KEY = 'admin_user';

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getAdminToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

export function setAdminSession(token: string, admin: AdminUser): void {
  const store = storage();
  if (!store) return;
  store.setItem(TOKEN_KEY, token);
  store.setItem(ADMIN_KEY, JSON.stringify(admin));
  emitAdminSessionChange();
}

export function getStoredAdmin(): AdminUser | null {
  const raw = storage()?.getItem(ADMIN_KEY) ?? null;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function clearAdminSession(): void {
  const store = storage();
  if (!store) return;
  store.removeItem(TOKEN_KEY);
  store.removeItem(ADMIN_KEY);
  emitAdminSessionChange();
}

// External store agar komponen bisa membaca sesi tanpa setState di effect.
// Snapshot berupa string agar stabil antar render.
type SessionListener = () => void;

const sessionListeners = new Set<SessionListener>();

function emitAdminSessionChange(): void {
  sessionListeners.forEach((listener) => listener());
}

export function subscribeAdminSession(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

export function getAdminSessionSnapshot(): string {
  const store = storage();
  if (!store) return '';
  const token = store.getItem(TOKEN_KEY);
  if (!token) return '';
  return `${token}::${store.getItem(ADMIN_KEY) ?? ''}`;
}

export function parseAdminSession(snapshot: string): {
  token: string;
  admin: AdminUser | null;
} | null {
  if (!snapshot) return null;
  const sep = snapshot.indexOf('::');
  const token = sep === -1 ? snapshot : snapshot.slice(0, sep);
  const raw = sep === -1 ? '' : snapshot.slice(sep + 2);
  let admin: AdminUser | null = null;
  if (raw) {
    try {
      admin = JSON.parse(raw) as AdminUser;
    } catch {
      admin = null;
    }
  }
  return { token, admin };
}
