"use client";

import { useEffect, useState } from "react";
import { ActionIcon } from "@/components/admin/ActionIcons";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import ExportCsvButton from "@/components/admin/ExportCsvButton";
import Pagination from "@/components/admin/Pagination";
import SelectWrapper from "@/components/admin/SelectWrapper";
import StatusBadge from "@/components/admin/StatusBadge";
import TableState from "@/components/admin/TableState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  downloadAdminCsv,
  getAdminUsers,
  updateAdminUserStatus,
  type AdminUserItem,
  type Paginated,
  type UserStatus,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";
import { initialsOf } from "@/lib/format";
import CreateOfficialAccountDialog from "./_components/CreateOfficialAccountDialog";
import UserDetailDialog from "./_components/UserDetailDialog";
import {
  ACTION_COPY,
  accountTypeMeta,
  statusMeta,
  VerifiedCheckIcon,
} from "./_components/user-meta";

const LOAD_ERROR =
  "Gagal memuat daftar pengguna. Pastikan backend berjalan lalu coba lagi.";

export default function UsersAdminPage() {
  const [result, setResult] = useState<Paginated<AdminUserItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [faculty, setFaculty] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400, () =>
    setPage(1),
  );
  const debouncedFaculty = useDebouncedValue(faculty.trim(), 400, () =>
    setPage(1),
  );
  const [retryKey, setRetryKey] = useState(0);
  const [confirm, setConfirm] = useState<{
    user: AdminUserItem;
    nextStatus: Exclude<UserStatus, "inactive">;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUserItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getAdminUsers(
      {
        page,
        status: status || undefined,
        account_type: accountTypeFilter || undefined,
        search: debouncedSearch || undefined,
        faculty: debouncedFaculty || undefined,
      },
      { signal: controller.signal },
    ).then(
      (data) => {
        if (controller.signal.aborted) return;
        if (data.data.length === 0 && data.current_page > 1) {
          setPage(data.current_page - 1);
          return;
        }
        setError(null);
        setResult(data);
      },
      (err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError(LOAD_ERROR);
      },
    );
    return () => {
      controller.abort();
    };
  }, [
    page,
    status,
    accountTypeFilter,
    debouncedSearch,
    debouncedFaculty,
    retryKey,
  ]);

  async function handleConfirm() {
    if (!confirm) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateAdminUserStatus(confirm.user.id, confirm.nextStatus);
      setConfirm(null);
      setRetryKey((k) => k + 1);
    } catch (err) {
      setActionError(
        extractAdminError(err, "Gagal memperbarui status pengguna. Coba lagi."),
      );
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
          account_type: accountTypeFilter || undefined,
          search: debouncedSearch || undefined,
          faculty: debouncedFaculty || undefined,
        },
        "users-mahasiswa.csv",
      );
    } catch (err) {
      setActionError(
        extractAdminError(err, "Gagal mengekspor CSV. Coba lagi."),
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
            Komunitas &amp; Akun Resmi
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Manajemen Users
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Kelola akun mahasiswa dan siapkan akun resmi terverifikasi untuk
            HIMA, Ormawa, atau Fakultas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800"
          >
            + Buat Akun Resmi
          </button>
          <ExportCsvButton exporting={exporting} onClick={handleExport} />
        </div>
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
        <div className="relative lg:col-span-4">
          <ActionIcon
            name="search"
            className="absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau NIM…"
            aria-label="Cari pengguna"
            className="w-full rounded-lg bg-slate-100 py-2 pr-4 pl-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="lg:col-span-3">
          <input
            type="text"
            value={faculty}
            onChange={(e) => setFaculty(e.target.value)}
            placeholder="Filter fakultas…"
            aria-label="Filter fakultas"
            className="w-full rounded-lg bg-slate-100 px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="flex items-center gap-2 lg:col-span-3">
          <label
            htmlFor="user-type-filter"
            className="shrink-0 text-xs font-semibold text-slate-500"
          >
            Tipe
          </label>
          <SelectWrapper className="w-full">
            <select
              id="user-type-filter"
              value={accountTypeFilter}
              onChange={(e) => {
                setAccountTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full cursor-pointer appearance-none rounded-lg bg-slate-100 py-2 pr-8 pl-3.5 text-sm text-slate-800 outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">Semua Tipe</option>
              <option value="ormawa">Ormawa</option>
              <option value="hima">HIMA</option>
              <option value="faculty">Fakultas</option>
              <option value="student">Mahasiswa</option>
            </select>
          </SelectWrapper>
        </div>
        <div className="flex items-center gap-2 lg:col-span-2 lg:justify-end">
          <label
            htmlFor="user-status-filter"
            className="shrink-0 text-xs font-semibold text-slate-500"
          >
            Status
          </label>
          <SelectWrapper className="w-full">
            <select
              id="user-status-filter"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full cursor-pointer appearance-none rounded-lg bg-slate-100 py-2 pr-8 pl-3.5 text-sm text-slate-800 outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">Semua</option>
              <option value="active">Aktif</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </SelectWrapper>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl bg-white shadow-sm">
        <TableState
          error={error}
          onRetry={() => {
            setError(null);
            setRetryKey((k) => k + 1);
          }}
          loading={!result}
          loadingLabel="Memuat pengguna"
          empty={Boolean(result && result.data.length === 0)}
          emptyTitle="Tidak ada pengguna ditemukan"
          emptyMessage="Ubah kata kunci pencarian, fakultas, tipe akun, atau filter status."
        >
          {result && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                      <th className="px-4 py-3.5 font-medium">Pengguna</th>
                      <th className="px-4 py-3.5 font-medium">Tipe</th>
                      <th className="px-4 py-3.5 font-medium">NIM</th>
                      <th className="px-4 py-3.5 font-medium">Fakultas</th>
                      <th className="px-4 py-3.5 font-medium">Status</th>
                      <th className="px-4 py-3.5 text-right font-medium">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {result.data.map((user) => {
                      const displayName = user.profile?.name || user.name;
                      const meta = statusMeta(user.status);
                      const typeMeta = accountTypeMeta(user.account_type);
                      return (
                        <tr
                          key={user.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                                {initialsOf(displayName)}
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => setDetailUser(user)}
                                  className="flex max-w-56 items-center gap-1.5 text-left text-sm font-semibold text-slate-900 transition hover:text-sky-600"
                                >
                                  <span className="truncate">{displayName}</span>
                                  {typeMeta.isOfficial && <VerifiedCheckIcon />}
                                </button>
                                <p className="max-w-56 truncate text-xs text-slate-400">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${typeMeta.pillClass}`}
                            >
                              {typeMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-mono text-xs whitespace-nowrap text-slate-700">
                            {user.profile?.nim || "-"}
                          </td>
                          <td className="max-w-44 truncate px-4 py-4 text-slate-600">
                            {user.profile?.faculty || "-"}
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
                                    setConfirm({
                                      user,
                                      nextStatus: "suspended",
                                    })
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
        </TableState>
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
          onUpdated={() => setRetryKey((k) => k + 1)}
          onClose={() => setDetailUser(null)}
        />
      )}

      {showCreateModal && (
        <CreateOfficialAccountDialog
          onCreated={() => {
            setPage(1);
            setRetryKey((k) => k + 1);
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </main>
  );
}
