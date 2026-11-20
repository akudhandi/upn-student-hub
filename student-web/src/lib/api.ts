import { clearAuth, getToken, getUser, type AuthUser } from "./auth";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

export type ApiError = Error & {
  status?: number;
  errors?: Record<string, string[]>;
  data?: unknown;
};

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token && token !== "dev-token") {
    headers.Authorization = `Bearer ${token}`;
  } else if (token === "dev-token" && process.env.NODE_ENV !== "production") {
    const user = getUser();
    headers["X-Dev-User-Id"] = String(user?.id || 1);
  }
  return headers;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Accept: "application/json",
      ...buildAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      !path.startsWith("/v1/auth/")
    ) {
      clearAuth();
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
    const message =
      (data as { message?: string }).message ||
      (data as { error?: string }).error ||
      `Request failed with status ${res.status}`;

    const error = new Error(message) as ApiError;
    error.status = res.status;
    error.errors = (data as { errors?: Record<string, string[]> }).errors;
    error.data = data;
    throw error;
  }

  return data as T;
}

export async function uploadMedia(
  file: File,
  folder:
    | "listings"
    | "marketplace"
    | "services"
    | "lost-found"
    | "events"
    | "avatars" = "listings"
): Promise<{ path: string; url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await apiFetch<{
    message: string;
    data: { path: string; url: string };
  }>("/v1/media/upload", {
    method: "POST",
    body: formData,
  });

  return res.data;
}

export type PublicCategory = {
  id: number;
  name: string;
  slug: string;
  type: string;
};

export async function fetchPublicCategories(
  type: "marketplace" | "service" | "lost_found" | "event"
): Promise<PublicCategory[]> {
  const res = await apiFetch<{ message: string; data: PublicCategory[] }>(
    `/v1/categories?type=${type}`
  );
  return res.data;
}

// ---- Auth helpers ----

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  nim?: string;
  faculty?: string;
};

export type AuthResponse = {
  message: string;
  token: string;
  user: AuthUser;
};

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/v1/auth/logout", {
    method: "POST",
  });
}

export { API_BASE_URL };
