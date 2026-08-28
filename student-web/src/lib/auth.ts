export const TOKEN_KEY = "upn_student_hub_token";
export const USER_KEY = "upn_student_hub_user";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  status?: string;
  profile?: {
    name?: string;
    nim?: string | null;
    faculty?: string | null;
  } | null;
  // allow additional fields from backend without breaking
  [key: string]: unknown;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getStoredUserDisplayName(): string | null {
  const user = getUser();
  if (!user) return null;
  // Prefer profile.name, fallback to user.name
  if (user.profile && typeof user.profile === "object" && "name" in user.profile) {
    const profileName = (user.profile as { name?: string }).name;
    if (profileName) return profileName;
  }
  return user.name ?? null;
}

export function setAuth(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
