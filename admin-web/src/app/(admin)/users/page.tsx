"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  downloadAdminCsv,
  getAdminUserDetail,
  getAdminUsers,
  updateAdminUserStatus,
  type AdminUserDetail,
  type AdminUserItem,
  type Paginated,
  type UserStatus,
} from "@/lib/admin-api";
import { shortReportableType } from "@/lib/format";

const LOAD_ERROR =
  "Gagal memuat daftar pengguna. Pastikan backend berjalan lalu coba lagi.";

function statusMeta(status: string): {
  label: string;
  tone: "green" | "amber" | "rose" | "slate";
} {
  switch (status) {
    case "active":
      return { label: "Aktif", tone: "green" };
    case "suspended":
      return { label: "Suspended", tone: "amber" };
    case "banned":
      return { label: "Banned", tone: "rose" };
    case "inactive":
      return { label: "Nonaktif", tone: "slate" };
    default:
      return { label: status, tone: "slate" };
  }
}

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

const ACTION_COPY: Record<
  Exclude<UserStatus, "inactive">,
  { title: string; message: string; confirm: string; danger: boolean }
> = {
  active: {
    title: "Aktifkan kembali pengguna?",
    message: "Pengguna dapat kembali mengakses dan berinteraksi di portal mahasiswa.",
    confirm: "Aktifkan",
    danger: false,
  },
  suspended: {
    title: "Suspend akun pengguna?",
    message: "Akses interaksi pengguna akan ditangguhkan sementara.",
    confirm: "Suspend",
    danger: false,
  },
  banned: {
    title: "Ban akun pengguna?",
    message: "Pengguna akan diblokir dan tidak dapat login ke portal mahasiswa.",
    confirm: "Ban Pengguna",
    danger: true,
  },
};

function UserDetailDialog({
  userId,
  fallbackUser,
  onClose,
}: {
  userId: number;
  fallbackUser: AdminUserItem;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    getAdminUserDetail(userId).then(
      (data) => {
        if (!cancelled) setDetail(data);
      },
      () => {
        if (!cancelled) setError("Gagal memuat riwayat aktivitas pengguna.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const user = detail?.user ?? fallbackUser;
  const displayName = user.profile?.name || user.name;
  const meta = statusMeta(user.status);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detail ${displayName}`}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {initialsOf(displayName)}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{displayName}</h3>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <StatusBadge label={meta.label} tone={meta.tone} />
        </div>

        <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">NIM</dt>
            <dd className="font-mono font-semibold text-slate-800">
              {user.profile?.nim || "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Fakultas</dt>
            <dd className="font-medium text-right text-slate-800">
              {user.profile?.faculty || "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Total Konten / Listing</dt>
            <dd className="font-bold text-slate-900">
              {detail ? `${detail.listings_count} item` : "…"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Terdaftar</dt>
            <dd className="font-medium text-slate-800">
              {new Date(user.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>

        {user.profile?.bio && (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {user.profile.bio}
          </p>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Riwayat Laporan Terkait
          </h4>
          {error ? (
            <p className="mt-2 text-xs text-rose-600">{error}</p>
          ) : !detail ? (
            <div className="mt-2 h-14 animate-pulse rounded-lg bg-slate-100" />
          ) : detail.reports_history.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              Tidak ada catatan pelaporan pada akun ini.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {detail.reports_history.map((rep) => (
                <li
                  key={rep.id}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">
                      {shortReportableType(rep.reportable_type)} #{rep.reportable_id}
                    </span>
                    <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                      {rep.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-slate-600">{rep.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersAdminPage() {
  const [result, setResult] = useState<Paginated<AdminUserItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [faculty, setFaculty] = useState("");
  const [debounced, setDebounced] = useState({ search: "", faculty: "" });
  const [retryKey, setRetryKey] = useState(0);
  const [confirm, setConfirm] = useState<{
    user: AdminUserItem;
    nextStatus: Exclude<UserStatus, "inactive">;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserItem | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced({ search: search.trim(), faculty: faculty.trim() });
      setPage(1);
    }, 400);
    return () => window.clearTimeout(t);
  }, [search, faculty]);

  useEffect(() => {
    let cancelled = false;
    getAdminUsers({
      page,
      status: status || undefined,
      search: debounced.search || undefined,
      faculty: debounced.faculty || undefined,
    }).then(
      (data) => {
        if (cancelled) return;
        if (data.data.length === 0 && data.current_page > 1) {
          setPage(data.current_page - 1);
          return;
        }
        setResult(data);
      },
      () => {
        if (cancelled) return;
        setError(LOAD_ERROR);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [page, status, debounced, retryKey]);

  async function handleConfirm() {
    if (!confirm) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateAdminUserStatus(confirm.user.id, confirm.nextStatus);
      setConfirm(null);
      const data = await getAdminUsers({
        page,
        status: status || undefined,
        search: debounced.search || undefined,
        faculty: debounced.faculty || undefined,
      });
      setResult(data);
    } catch {
      setActionError("Gagal memperbarui status pengguna. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setActionError(null);
    try {
      await downloadAdminCsv(
        "/admin/users/export",
        {
          status: status || undefined,
          search: debounced.search || undefined,
          faculty: debounced.faculty || undefined,
        },
        "users-mahasiswa.csv",
      );
    } catch {
      setActionError("Gagal mengekspor CSV. Coba lagi.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Komunitas
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Manajemen Users
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Kelola akun mahasiswa terdaftar, tinjau profil &amp; riwayat laporan, serta atur status akses.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-60 sm:self-auto"
        >
          <svg
            className="h-4 w-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          {exporting ? "Mengekspor…" : "Ekspor CSV"}
        </button>
      </section>

      {actionError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
        >
          {actionError}
        </p>
      )}

      <section className="grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow-sm lg:grid-cols-12">
        <div className="relative lg:col-span-5">
          <svg
            className="absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau NIM…"
            aria-label="Cari pengguna"
            className="w-full rounded-lg bg-slate-100 py-2 pr-4 pl-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="lg:col-span-4">
          <input
            type="text"
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
            placeholder="Filter fakultas (mis. Ilmu Komputer)…"
            aria-label="Filter fakultas"
            className="w-full rounded-lg bg-slate-100 px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="flex items-center gap-2 lg:col-span-3 lg:justify-end">
          <label htmlFor="user-status-filter" className="text-xs font-semibold text-slate-500">
            Status
          </label>
          <select
            id="user-status-filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full cursor-pointer appearance-none rounded-lg bg-slate-100 py-2 pr-8 pl-3.5 text-sm text-slate-800 outline-none focus:ring-1 focus:ring-sky-500 lg:w-auto"
          >
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        {error ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12">
            <p role="alert" className="text-sm font-medium text-rose-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setRetryKey((k) => k + 1);
              }}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Coba lagi
            </button>
          </div>
        ) : !result ? (
          <div className="space-y-3 p-4" aria-label="Memuat pengguna">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : result.data.length === 0 ? (
          <EmptyState
            title="Tidak ada pengguna ditemukan"
            message="Ubah kata kunci pencarian, fakultas, atau filter status."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                    <th className="px-4 py-3.5 font-medium">Mahasiswa</th>
                    <th className="px-4 py-3.5 font-medium">NIM</th>
                    <th className="px-4 py-3.5 font-medium">Fakultas</th>
                    <th className="px-4 py-3.5 font-medium">Bergabung</th>
                    <th className="px-4 py-3.5 font-medium">Status</th>
                    <th className="px-4 py-3.5 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {result.data.map((user) => {
                    const displayName = user.profile?.name || user.name;
                    const meta = statusMeta(user.status);
                    return (
                      <tr key={user.id} className="transition hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                              {initialsOf(displayName)}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setDetailUser(user)}
                                className="block max-w-56 truncate text-left text-sm font-semibold text-slate-900 transition hover:text-sky-600"
                              >
                                {displayName}
                              </button>
                              <p className="max-w-56 truncate text-xs text-slate-400">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs whitespace-nowrap text-slate-700">
                          {user.profile?.nim || "-"}
                        </td>
                        <td className="max-w-44 truncate px-4 py-4 text-slate-600">
                          {user.profile?.faculty || "-"}
                        </td>
                        <td className="px-4 py-4 text-xs whitespace-nowrap text-slate-400">
                          {new Date(user.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge label={meta.label} tone={meta.tone} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailUser(user)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                              Detail
                            </button>
                            {user.status !== "active" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirm({ user, nextStatus: "active" })
                                }
                                className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-500/25"
                              >
                                Aktifkan
                              </button>
                            )}
                            {user.status !== "suspended" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirm({ user, nextStatus: "suspended" })
                                }
                                className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-500/25"
                              >
                                Suspend
                              </button>
                            )}
                            {user.status !== "banned" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirm({ user, nextStatus: "banned" })
                                }
                                className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/25"
                              >
                                Ban
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={result.current_page}
              lastPage={result.last_page}
              total={result.total}
              onPage={setPage}
            />
          </>
        )}
      </section>

      {confirm && (
        <ConfirmDialog
          title={ACTION_COPY[confirm.nextStatus].title}
          message={`${ACTION_COPY[confirm.nextStatus].message} (${confirm.user.profile?.name || confirm.user.name})`}
          confirmLabel={ACTION_COPY[confirm.nextStatus].confirm}
          danger={ACTION_COPY[confirm.nextStatus].danger}
          busy={busy}
          onConfirm={handleConfirm}
          onCancel={() => {
            if (!busy) setConfirm(null);
          }}
        />
      )}

      {detailUser && (
        <UserDetailDialog
          userId={detailUser.id}
          fallbackUser={detailUser}
          onClose={() => setDetailUser(null)}
        />
      )}
    </main>
  );
}
