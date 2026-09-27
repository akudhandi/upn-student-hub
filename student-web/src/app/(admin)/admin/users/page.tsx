"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  StatusPill,
  TableEmpty,
  TableError,
  TableLoading,
  type PillTone,
} from "@/components/admin-ui";

type AdminUserItem = {
  id: number;
  name: string;
  email: string;
  status: string;
  profile?: {
    name?: string | null;
    nim?: string | null;
    faculty?: string | null;
    avatar?: string | null;
  } | null;
};

type UserListResponse = {
  message: string;
  data: {
    current_page: number;
    last_page: number;
    total: number;
    data: AdminUserItem[];
  };
};

const STATUS_PILL: Record<string, { tone: PillTone; label: string }> = {
  active: { tone: "green", label: "Aktif" },
  suspended: { tone: "red", label: "Suspended" },
  inactive: { tone: "slate", label: "Nonaktif" },
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<AdminUserItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const loadUsers = useCallback(async (search: string, pageNum: number, signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(pageNum) });
      if (search) params.set("search", search);
      const res = await apiFetch<UserListResponse>(`/v1/admin/users?${params.toString()}`);
      if (signal?.aborted) return;
      setItems(res.data.data);
      setPage(res.data.current_page);
      setLastPage(res.data.last_page);
      setTotal(res.data.total);
    } catch {
      if (signal?.aborted) return;
      setItems([]);
      setError("Gagal memuat data pengguna. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and search change
    void loadUsers(debouncedQuery, 1, controller.signal);
    return () => {
      controller.abort();
    };
  }, [debouncedQuery, loadUsers]);

  function refresh() {
    void loadUsers(debouncedQuery, page);
  }

  async function toggleStatus(user: AdminUserItem) {
    const nextStatus = user.status === "active" ? "suspended" : "active";
    try {
      setActionId(user.id);
      setActionError(null);
      await apiFetch(`/v1/admin/users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setItems((prev) => prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)));
    } catch {
      setActionError(`Gagal memperbarui status ${user.name}. Coba lagi.`);
    } finally {
      setActionId(null);
    }
  }

  function goToPage(pageNum: number) {
    if (pageNum < 1 || pageNum > lastPage || pageNum === page) return;
    void loadUsers(debouncedQuery, pageNum);
  }

  return (
    <div>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]">Manajemen User</h1>
        <p className="mt-1 max-w-[560px] text-sm text-slate-500">
          Cari akun mahasiswa berdasarkan nama, NPM, atau email, lalu suspend atau aktifkan kembali.
        </p>
      </div>

      <div className="relative mt-4 max-w-[420px]">
        <label htmlFor="admin-users-search" className="sr-only">
          Cari pengguna berdasarkan nama, NPM, atau email
        </label>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </span>
        <Input
          id="admin-users-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama, NPM, atau email…"
          className="pl-9"
        />
      </div>

      {actionError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {actionError}
        </div>
      )}

      <div className="mt-4">
        {isLoading ? (
          <TableLoading label="Memuat data pengguna" columns={5} />
        ) : error ? (
          <TableError message={error} onRetry={refresh} />
        ) : items.length === 0 ? (
          <TableEmpty
            title="Pengguna tidak ditemukan"
            description={
              debouncedQuery
                ? "Coba kata kunci lain untuk nama, NPM, atau email."
                : "Belum ada akun mahasiswa terdaftar."
            }
          />
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500" role="status">
              Menampilkan {items.length} dari {total} pengguna
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Nama Lengkap</th>
                    <th scope="col" className="px-4 py-3 font-semibold">NPM</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      <span className="sr-only">Aksi</span>Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((user) => {
                    const displayName = user.profile?.name || user.name;
                    const pill = STATUS_PILL[user.status] ?? { tone: "slate" as PillTone, label: user.status };
                    const busy = actionId === user.id;
                    const isActive = user.status === "active";
                    return (
                      <tr key={user.id} className="align-top hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700"
                              role="img"
                              aria-label={`Avatar ${displayName}`}
                            >
                              {initialsOf(displayName)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold text-slate-900">{displayName}</p>
                              {user.profile?.faculty && (
                                <p className="truncate text-xs text-slate-500">{user.profile.faculty}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">
                          {user.profile?.nim ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-[13px] text-slate-600">{user.email}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Button
                            size="sm"
                            variant={isActive ? "secondary" : "primary"}
                            disabled={busy}
                            onClick={() => void toggleStatus(user)}
                            aria-label={isActive ? `Suspend ${displayName}` : `Aktifkan kembali ${displayName}`}
                          >
                            {busy ? "…" : isActive ? "Suspend" : "Aktifkan"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {lastPage > 1 && (
              <nav aria-label="Navigasi halaman pengguna" className="mt-4 flex items-center justify-center gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                  ← Sebelumnya
                </Button>
                <span className="text-xs text-slate-500" role="status">
                  Halaman {page} dari {lastPage}
                </span>
                <Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => goToPage(page + 1)}>
                  Berikutnya →
                </Button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
