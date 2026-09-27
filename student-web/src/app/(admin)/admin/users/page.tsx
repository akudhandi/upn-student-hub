"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FilterTabs,
  Modal,
  StatusPill,
  TableEmpty,
  TableError,
  TableLoading,
  type PillTone,
} from "@/components/admin-ui";

type Profile = {
  nim?: string | null;
  name?: string | null;
  faculty?: string | null;
  bio?: string | null;
};

type AdminUserItem = {
  id: number;
  name: string;
  email: string;
  status: string;
  created_at: string;
  profile?: Profile | null;
};

type UserListResponse = {
  message: string;
  data: { current_page: number; last_page: number; total: number; data: AdminUserItem[] };
};

type ReportHistoryItem = {
  id: number;
  reportable_type: string;
  reportable_id: number;
  reason: string;
  status: string;
  created_at: string;
  reporter?: { id: number; name: string } | null;
};

type UserDetail = {
  user: AdminUserItem;
  listings_count: number;
  reports_history: ReportHistoryItem[];
};

type UserDetailResponse = { message: string; data: UserDetail };

type StatusFilter = "all" | "active" | "suspended" | "banned" | "inactive";

const STATUS_TABS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "banned", label: "Banned" },
];

const STATUS_PILL: Record<string, { tone: PillTone; label: string }> = {
  active: { tone: "green", label: "Aktif" },
  suspended: { tone: "amber", label: "Suspended" },
  banned: { tone: "red", label: "Banned" },
  inactive: { tone: "slate", label: "Nonaktif" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function initialsOf(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function AdminUsersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [faculty, setFaculty] = useState("");
  const [debounced, setDebounced] = useState({ q: "", f: "" });
  const [items, setItems] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced({ q: query.trim(), f: faculty.trim() }), 400);
    return () => clearTimeout(timer);
  }, [query, faculty]);

  const loadUsers = useCallback(
    async (status: StatusFilter, search: string, facultyName: string, signal?: AbortSignal) => {
      try {
        setIsLoading(true);
        setError(null);
        const params = new URLSearchParams({ page: "1" });
        if (status !== "all") params.set("status", status);
        if (search) params.set("search", search);
        if (facultyName) params.set("faculty", facultyName);
        const res = await apiFetch<UserListResponse>(`/v1/admin/users?${params.toString()}`);
        if (signal?.aborted) return;
        setItems(res.data.data);
        setTotal(res.data.total);
      } catch {
        if (signal?.aborted) return;
        setItems([]);
        setError("Gagal memuat data pengguna. Periksa koneksi ke backend lalu coba lagi.");
      } finally {
        if (signal?.aborted) return;
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and filter change
    void loadUsers(statusFilter, debounced.q, debounced.f, controller.signal);
    return () => {
      controller.abort();
    };
  }, [statusFilter, debounced, loadUsers]);

  async function setStatus(id: number, status: "active" | "suspended" | "banned") {
    try {
      setActionId(id);
      setActionError(null);
      await apiFetch(`/v1/admin/users/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setItems((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
      setDetail((prev) => (prev && prev.user.id === id ? { ...prev, user: { ...prev.user, status } } : prev));
    } catch {
      setActionError("Gagal memperbarui status pengguna. Coba lagi.");
    } finally {
      setActionId(null);
    }
  }

  async function openDetail(id: number) {
    setDetailId(id);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await apiFetch<UserDetailResponse>(`/v1/admin/users/${id}`);
      setDetail(res.data);
    } catch {
      setDetailError("Gagal memuat detail pengguna.");
    } finally {
      setDetailLoading(false);
    }
  }

  const detailUser = detail?.user ?? items.find((u) => u.id === detailId) ?? null;

  return (
    <div>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]">Manajemen User</h1>
        <p className="mt-1 max-w-[600px] text-sm text-slate-500">
          Kelola akun mahasiswa: lihat detail, suspend, ban, atau aktifkan kembali.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <FilterTabs ariaLabel="Filter pengguna berdasarkan status" options={STATUS_TABS} value={statusFilter} onChange={setStatusFilter} />
        <div className="grid grid-cols-1 gap-3 sm:max-w-[620px] sm:grid-cols-2">
          <div>
            <Label htmlFor="users-search" className="sr-only">Cari pengguna</Label>
            <Input id="users-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama, NPM, email…" />
          </div>
          <div>
            <Label htmlFor="users-faculty" className="sr-only">Filter fakultas</Label>
            <Input id="users-faculty" value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="Filter fakultas / prodi…" />
          </div>
        </div>
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
          <TableError message={error} onRetry={() => void loadUsers(statusFilter, debounced.q, debounced.f)} />
        ) : items.length === 0 ? (
          <TableEmpty title="Pengguna tidak ditemukan" description="Coba kata kunci atau filter lain." />
        ) : (
          <>
            <p className="mb-2 text-xs text-slate-500" role="status">Menampilkan {items.length} dari {total} pengguna</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-4 py-3 font-semibold">Nama</th>
                    <th scope="col" className="px-4 py-3 font-semibold">NPM</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Prodi / Fakultas</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Bergabung</th>
                    <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Aksi</span>Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((user) => {
                    const displayName = user.profile?.name || user.name;
                    const pill = STATUS_PILL[user.status] ?? { tone: "slate" as PillTone, label: user.status };
                    const busy = actionId === user.id;
                    return (
                      <tr key={user.id} className="align-top hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700" role="img" aria-label={`Avatar ${displayName}`}>
                              {initialsOf(displayName)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-semibold text-slate-900">{displayName}</p>
                              <p className="truncate text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{user.profile?.nim ?? "-"}</td>
                        <td className="max-w-[180px] px-4 py-3 text-[13px] text-slate-600">
                          <p className="line-clamp-2">{user.profile?.faculty ?? "-"}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3"><StatusPill tone={pill.tone}>{pill.label}</StatusPill></td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{formatDate(user.created_at)}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="secondary" disabled={busy} onClick={() => void openDetail(user.id)} aria-label={`Detail ${displayName}`}>Detail</Button>
                            {user.status === "active" ? (
                              <Button size="sm" variant="secondary" disabled={busy} onClick={() => void setStatus(user.id, "suspended")} aria-label={`Suspend ${displayName}`}>Suspend</Button>
                            ) : (
                              <Button size="sm" disabled={busy} onClick={() => void setStatus(user.id, "active")} aria-label={`Aktifkan ${displayName}`}>Aktifkan</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {detailId !== null && (
        <Modal
          title={detailLoading ? "Memuat detail…" : detailUser ? `Detail ${detailUser.profile?.name || detailUser.name}` : "Detail pengguna"}
          description="Profil, riwayat laporan, dan tindakan akun."
          onClose={() => {
            setDetailId(null);
            setDetail(null);
          }}
        >
          {detailLoading ? (
            <div role="status" aria-busy="true" aria-label="Memuat detail pengguna" className="space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
              <span className="sr-only">Memuat…</span>
            </div>
          ) : detailError || !detail ? (
            <p role="alert" className="text-sm text-red-600">{detailError ?? "Data tidak tersedia."}</p>
          ) : (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-slate-500">NPM</dt><dd className="font-medium text-slate-900">{detail.user.profile?.nim ?? "-"}</dd></div>
                <div><dt className="text-xs text-slate-500">Email</dt><dd className="font-medium text-slate-900">{detail.user.email}</dd></div>
                <div><dt className="text-xs text-slate-500">Fakultas</dt><dd className="font-medium text-slate-900">{detail.user.profile?.faculty ?? "-"}</dd></div>
                <div><dt className="text-xs text-slate-500">Total listing</dt><dd className="font-medium text-slate-900">{detail.listings_count}</dd></div>
              </dl>
              <div>
                <h3 className="text-[13px] font-semibold text-slate-900">Riwayat laporan</h3>
                {detail.reports_history.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">Tidak ada riwayat laporan.</p>
                ) : (
                  <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                    {detail.reports_history.map((r) => (
                      <li key={r.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        #{r.id} • {r.reason} • {r.status} • {formatDate(r.created_at)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Button size="sm" variant="secondary" disabled={actionId === detail.user.id} onClick={() => void setStatus(detail.user.id, "suspended")}>Suspend</Button>
                <Button size="sm" variant="secondary" disabled={actionId === detail.user.id} onClick={() => void setStatus(detail.user.id, "banned")}>Ban</Button>
                <Button size="sm" disabled={actionId === detail.user.id} onClick={() => void setStatus(detail.user.id, "active")}>Aktifkan kembali</Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
