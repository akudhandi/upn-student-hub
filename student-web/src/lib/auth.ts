export const TOKEN_KEY = "upn_student_hub_token";
export const USER_KEY = "upn_student_hub_user";
export const USER_UPDATED_EVENT = "upn-user-updated";

export type AccountType = "student" | "hima" | "ormawa" | "faculty";

export const OFFICIAL_ACCOUNT_TYPES: readonly AccountType[] = [
  "hima",
  "ormawa",
  "faculty",
];

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  status?: string;
  account_type?: AccountType | string;
  is_official_account?: boolean;
  created_at?: string;
  profile?: {
    name?: string;
    nim?: string | null;
    faculty?: string | null;
    bio?: string | null;
    avatar?: string | null;
  } | null;
};

export function isOfficialAccount(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.is_official_account === true) return true;
  if (
    typeof user.account_type === "string" &&
    OFFICIAL_ACCOUNT_TYPES.includes(user.account_type as AccountType)
  ) {
    return true;
  }
  return false;
}

export function accountTypeLabel(accountType?: string | null): string {
  switch (accountType) {
    case "ormawa":
      return "Ormawa Resmi";
    case "hima":
      return "HIMA Resmi";
    case "faculty":
      return "Akun Fakultas";
    default:
      return "Mahasiswa";
  }
}

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
  return user.profile?.name || user.name || null;
}

export function setAuth(token: string, user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(USER_UPDATED_EVENT));
}

export function updateStoredUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(USER_UPDATED_EVENT));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(USER_UPDATED_EVENT));
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
