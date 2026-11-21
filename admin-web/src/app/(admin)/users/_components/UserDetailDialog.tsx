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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#141416] text-sm font-semibold text-white">
            {initialsOf(displayName)}
          </div>
          <div>
            <h3 className="flex items-center gap-1.5 font-display text-base font-semibold text-[#141416]">
              <span>{displayName}</span>
              {typeMeta.isOfficial && <VerifiedCheckIcon />}
            </h3>
            <p className="text-xs text-[#6E6A66]">{user.email}</p>
          </div>
        </div>
        <StatusBadge label={meta.label} tone={meta.tone} />
      </div>

      <dl className="mt-5 space-y-2 border-t border-[#F2EEEA] pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[#787470]">Tipe Akun</dt>
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
          <dt className="text-[#787470]">NIM</dt>
          <dd className="font-mono font-semibold text-[#141416]">
            {user.profile?.nim || "-"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#787470]">Fakultas</dt>
          <dd className="text-right font-medium text-[#141416]">
            {user.profile?.faculty || "-"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#787470]">Total Konten / Listing</dt>
          <dd className="font-semibold text-[#141416]">
            {detail ? `${detail.listings_count} item` : "…"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#787470]">Terdaftar</dt>
          <dd className="font-medium text-[#141416]">
            {formatDate(user.created_at)}
          </dd>
        </div>
      </dl>

      {user.profile?.bio && (
        <p className="mt-4 rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] p-3 text-sm text-[#57534E]">
          {user.profile.bio}
        </p>
      )}

      {/* Role & Credentials Provisioning */}
      <form
        onSubmit={handleSaveRole}
        className="mt-5 space-y-3 rounded-2xl border border-[#E5E0DA] bg-[#FAF8F6] p-4"
      >
        <h4 className="text-xs font-semibold tracking-wider text-[#57534E] uppercase">
          Pengaturan Tipe Akun &amp; Kredensial
        </h4>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="detail-account-type"
              className="block text-[11px] font-semibold text-[#57534E]"
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
              className="mt-1 w-full rounded-xl border border-[#E5E0DA] bg-white px-2.5 py-1.5 text-xs text-[#141416] focus:border-[#141416] focus:ring-2 focus:ring-[#141416]/10 focus:outline-none"
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
              className="block text-[11px] font-semibold text-[#57534E]"
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
                className="w-full rounded-xl border border-[#E5E0DA] bg-white px-2.5 py-1.5 pr-16 text-xs text-[#141416] placeholder:text-[#8C8782] focus:border-[#141416] focus:ring-2 focus:ring-[#141416]/10 focus:outline-none"
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
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-[11px] font-semibold text-[#6E6A66] transition hover:text-[#141416] disabled:opacity-50"
              >
                {showResetPassword ? "Sembunyi" : "Tampil"}
              </button>
            </div>
          </div>
        </div>
        {roleNotice && (
          <p className="text-xs font-medium text-[#226A46]">{roleNotice}</p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingRole}
            className="rounded-full bg-[#141416] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#242428] disabled:opacity-60"
          >
            {savingRole ? "Menyimpan…" : "Simpan Pengaturan"}
          </button>
        </div>
      </form>

      <div className="mt-5 border-t border-[#F2EEEA] pt-4">
        <h4 className="text-xs font-semibold tracking-wider text-[#6E6A66] uppercase">
          Riwayat Laporan Terkait
        </h4>
        {error ? (
          <p className="mt-2 text-xs text-[#A62D2D]">{error}</p>
        ) : !detail ? (
          <div className="mt-2 h-14 animate-pulse rounded-xl bg-[#EFECE8]" />
        ) : detail.reports_history.length === 0 ? (
          <p className="mt-2 text-xs text-[#787470]">
            Tidak ada catatan pelaporan pada akun ini.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {detail.reports_history.map((rep) => (
              <li
                key={rep.id}
                className="rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#141416]">
                    {shortReportableType(rep.reportable_type)} #
                    {rep.reportable_id}
                  </span>
                  <span className="rounded-full bg-[#EFECE8] px-2 py-0.5 text-[10px] font-semibold text-[#57534E] uppercase">
                    {rep.status}
                  </span>
                </div>
                <p className="mt-0.5 text-[#57534E]">{rep.reason}</p>
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
          className="rounded-full border border-[#DFD9D2] bg-white px-4 py-2 text-xs font-semibold text-[#141416] transition hover:border-[#CFC8BF] hover:bg-[#FAF8F6] disabled:opacity-50"
        >
          Tutup
        </button>
      </div>
    </ModalShell>
  );
}
