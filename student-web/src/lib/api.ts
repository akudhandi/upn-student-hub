const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
).replace(/\/$/, "");

export type ApiError = Error & {
  status?: number;
  errors?: Record<string, string[]>;
  data?: unknown;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });

  // Try to parse JSON even on error responses
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
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
};

import type { AuthUser } from "./auth";

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

export { API_BASE_URL };
