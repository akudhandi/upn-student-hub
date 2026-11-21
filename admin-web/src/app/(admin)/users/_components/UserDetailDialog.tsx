"use client";

import { useEffect, useState } from "react";
import ModalShell from "@/components/admin/ModalShell";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  getAdminUserDetail,
  updateAdminUserAccountType,
  type AdminUserDetail,
  type AdminUserItem,
  type UserAccountType,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";
import { formatDate, initialsOf, shortReportableType } from "@/lib/format";
import {
  ACCOUNT_TYPE_OPTIONS,
  accountTypeMeta,
  statusMeta,
  VerifiedCheckIcon,
} from "./user-meta";

export default function UserDetailDialog({
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
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getAdminUserDetail(userId, { signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted) {
          setError(null);
          setDetail(data);
          setNextAccountType(data.user.account_type ?? "student");
        }
      },
      (err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError("Gagal memuat riwayat aktivitas pengguna.");
      },
    );
    return () => {
      controller.abort();
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
    } catch (err) {
      setError(
        extractAdminError(err, "Gagal memperbarui tipe akun atau password."),
      );
    } finally {
      setSavingRole(false);
    }
  }

  return (
    <ModalShell
      ariaLabel={`Detail ${displayName}`}
      onClose={onClose}
      busy={savingRole}
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
            {formatDate(user.created_at)}
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
            <div className="relative mt-1">
              <input
                id="detail-reset-password"
                type={showResetPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                disabled={savingRole}
                placeholder="Kosongkan jika tetap"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 pr-16 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowResetPassword((v) => !v)}
                disabled={savingRole}
                aria-label={
                  showResetPassword
                    ? "Sembunyikan password"
                    : "Tampilkan password"
                }
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] font-semibold text-slate-500 transition hover:text-slate-800 disabled:opacity-50"
              >
                {showResetPassword ? "Sembunyi" : "Tampil"}
              </button>
            </div>
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
                    {shortReportableType(rep.reportable_type)} #
                    {rep.reportable_id}
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
          disabled={savingRole}
          className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Tutup
        </button>
      </div>
    </ModalShell>
  );
}
