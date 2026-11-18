"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  createAdminUser,
  downloadAdminCsv,
  getAdminUserDetail,
  getAdminUsers,
  updateAdminUserAccountType,
  updateAdminUserStatus,
  type AdminUserDetail,
  type AdminUserItem,
  type Paginated,
  type UserAccountType,
  type UserStatus,
} from "@/lib/admin-api";
import { shortReportableType } from "@/lib/format";

const LOAD_ERROR =
  "Gagal memuat daftar pengguna. Pastikan backend berjalan lalu coba lagi.";

const ACCOUNT_TYPE_OPTIONS: { value: UserAccountType; label: string }[] = [
  { value: "ormawa", label: "Ormawa (BEM / UKM)" },
  { value: "hima", label: "HIMA (Himpunan)" },
  { value: "faculty", label: "Fakultas / Institusi" },
  { value: "student", label: "Mahasiswa Reguler" },
];

function accountTypeMeta(type?: string): {
  label: string;
  isOfficial: boolean;
  pillClass: string;
} {
  switch (type) {
    case "ormawa":
      return {
        label: "Ormawa",
        isOfficial: true,
        pillClass: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
      };
    case "hima":
      return {
        label: "HIMA",
        isOfficial: true,
        pillClass: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200",
      };
    case "faculty":
      return {
        label: "Fakultas",
        isOfficial: true,
        pillClass: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
      };
    default:
      return {
        label: "Mahasiswa",
        isOfficial: false,
        pillClass: "bg-slate-100 text-slate-600",
      };
  }
}

function VerifiedCheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="Akun resmi terverifikasi"
      className="inline-block shrink-0 text-sky-600"
    >
      <circle cx="10" cy="10" r="9" fill="currentColor" />
      <path
        d="M6.4 10.3L8.8 12.7L13.8 7.5"
        stroke="white"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function CreateOfficialAccountDialog({
  onCreated,
  onClose,
}: {
  onCreated: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<UserAccountType>("ormawa");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [faculty, setFaculty] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("Lengkapi nama akun, email valid, dan password minimal 8 karakter.");
      return;
    }

    setSaving(true);
    try {
      await createAdminUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        account_type: accountType,
        faculty: faculty.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err: unknown) {
      const maybeResponse = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
      const firstErr = maybeResponse?.errors
        ? Object.values(maybeResponse.errors).flat()[0]
        : null;
      setError(firstErr || maybeResponse?.message || "Gagal membuat akun baru.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buat akun resmi HIMA, Ormawa, atau Fakultas"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-slate-900">
          Buat Akun Resmi Portal Mahasiswa
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Akun HIMA, Ormawa, atau Fakultas dapat langsung login di Portal Mahasiswa
          menggunakan email &amp; password ini untuk mengajukan event terverifikasi.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="org-type"
                className="block text-xs font-semibold text-slate-700"
              >
                Tipe Akun
              </label>
              <select
                id="org-type"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as UserAccountType)}
                disabled={saving}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
              >
                {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="org-faculty"
                className="block text-xs font-semibold text-slate-700"
              >
                Fakultas / Lingkup
              </label>
              <input
                id="org-faculty"
                type="text"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                disabled={saving}
                placeholder="Mis. Fakultas Ilmu Komputer"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="org-name"
              className="block text-xs font-semibold text-slate-700"
            >
              Nama Organisasi / Fakultas / Akun *
            </label>
            <input
              id="org-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              placeholder="Mis. HIMA Informatika UPN"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="org-email"
                className="block text-xs font-semibold text-slate-700"
              >
                Email Login *
              </label>
              <input
                id="org-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
                placeholder="himatif@upnjatim.ac.id"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="org-password"
                className="block text-xs font-semibold text-slate-700"
              >
                Password Awal *
              </label>
              <input
                id="org-password"
                type="text"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={saving}
                placeholder="Minimal 8 karakter"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="org-bio"
              className="block text-xs font-semibold text-slate-700"
            >
              Deskripsi Singkat (Opsional)
            </label>
            <textarea
              id="org-bio"
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={saving}
              placeholder="Akun resmi penyelenggara kegiatan…"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Menyimpan…" : "Buat Akun"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserDetailDialog({
  userId,
  fallbackUser,
  onUpdated,
  onClose,
}: {
  userId: number;
  fallbackUser: AdminUserItem;
  onUpdated: () => void;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextAccountType, setNextAccountType] = useState<UserAccountType>(
    fallbackUser.account_type ?? "student",
  );
  const [resetPassword, setResetPassword] = useState("");
  const [savingRole, setSavingRole] = useState(false);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);

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
        if (!cancelled) {
          setDetail(data);
          setNextAccountType(data.user.account_type ?? "student");
        }
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
  const typeMeta = accountTypeMeta(user.account_type);

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault();
    setSavingRole(true);
    setRoleNotice(null);
    setError(null);
    try {
      const updated = await updateAdminUserAccountType(user.id, {
        account_type: nextAccountType,
        password: resetPassword.trim() || undefined,
      });
      setDetail((prev) => (prev ? { ...prev, user: updated } : prev));
      setResetPassword("");
      setRoleNotice("Tipe akun berhasil diperbarui.");
      onUpdated();
    } catch {
      setError("Gagal memperbarui tipe akun atau password.");
    } finally {
      setSavingRole(false);
    }
  }

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
              <h3 className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                <span>{displayName}</span>
                {typeMeta.isOfficial && <VerifiedCheckIcon />}
              </h3>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <StatusBadge label={meta.label} tone={meta.tone} />
        </div>

        <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Tipe Akun</dt>
            <dd>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeMeta.pillClass}`}
              >
                {typeMeta.isOfficial && <VerifiedCheckIcon />}
                {typeMeta.label}
              </span>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">NIM</dt>
            <dd className="font-mono font-semibold text-slate-800">
              {user.profile?.nim || "-"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-400">Fakultas</dt>
            <dd className="text-right font-medium text-slate-800">
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

        {/* Role & Credentials Provisioning */}
        <form
          onSubmit={handleSaveRole}
          className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
        >
          <h4 className="text-xs font-semibold tracking-wider text-slate-700 uppercase">
            Pengaturan Tipe Akun &amp; Kredensial
          </h4>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="detail-account-type"
                className="block text-[11px] font-semibold text-slate-600"
              >
                Tipe Akun
              </label>
              <select
                id="detail-account-type"
                value={nextAccountType}
                onChange={(e) =>
                  setNextAccountType(e.target.value as UserAccountType)
                }
                disabled={savingRole}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              >
                {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="detail-reset-password"
                className="block text-[11px] font-semibold text-slate-600"
              >
                Reset Password (Opsional)
              </label>
              <input
                id="detail-reset-password"
                type="text"
                minLength={8}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                disabled={savingRole}
                placeholder="Kosongkan jika tetap"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
              />
            </div>
          </div>
          {roleNotice && (
            <p className="text-xs font-medium text-emerald-700">{roleNotice}</p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingRole}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {savingRole ? "Menyimpan…" : "Simpan Pengaturan"}
            </button>
          </div>
        </form>

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
  const [accountTypeFilter, setAccountTypeFilter] = useState("");
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
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      account_type: accountTypeFilter || undefined,
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
  }, [page, status, accountTypeFilter, debounced, retryKey]);

  async function handleConfirm() {
    if (!confirm) return;
    setBusy(true);
    setActionError(null);
    try {
      await updateAdminUserStatus(confirm.user.id, confirm.nextStatus);
      setConfirm(null);
      setRetryKey((k) => k + 1);
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
          account_type: accountTypeFilter || undefined,
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
            Komunitas &amp; Akun Resmi
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Manajemen Users
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Kelola akun mahasiswa dan siapkan akun resmi terverifikasi untuk HIMA, Ormawa, atau Fakultas.
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
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-60"
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
        </div>
        <div className="flex items-center gap-2 lg:col-span-2 lg:justify-end">
          <label
            htmlFor="user-status-filter"
            className="shrink-0 text-xs font-semibold text-slate-500"
          >
            Status
          </label>
          <select
            id="user-status-filter"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full cursor-pointer appearance-none rounded-lg bg-slate-100 py-2 pr-8 pl-3 text-sm text-slate-800 outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Semua</option>
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
            message="Ubah kata kunci pencarian, fakultas, tipe akun, atau filter status."
          />
        ) : (
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
                    <th className="px-4 py-3.5 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {result.data.map((user) => {
                    const displayName = user.profile?.name || user.name;
                    const meta = statusMeta(user.status);
                    const typeMeta = accountTypeMeta(user.account_type);
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
