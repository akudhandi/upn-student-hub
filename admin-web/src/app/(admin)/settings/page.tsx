"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  getAdminProfile,
  getAdminSystemStatus,
  updateAdminPassword,
  type SystemStatusData,
} from "@/lib/admin-api";
import { getStoredAdmin, type AdminUser } from "@/lib/auth";
import { formatNumber } from "@/lib/format";

export default function SettingsAdminPage() {
  const [profile, setProfile] = useState<AdminUser | null>(() =>
    getStoredAdmin(),
  );
  const [system, setSystem] = useState<SystemStatusData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAdminProfile().catch(() => null),
      getAdminSystemStatus(),
    ]).then(
      ([prof, sys]) => {
        if (cancelled) return;
        setLoadError(null);
        if (prof) setProfile(prof);
        setSystem(sys);
      },
      () => {
        if (cancelled) return;
        setLoadError(
          "Gagal memuat status sistem. Pastikan backend berjalan lalu coba lagi.",
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setFormError("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Konfirmasi kata sandi baru tidak cocok.");
      return;
    }
    setSaving(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await updateAdminPassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFormSuccess("Kata sandi administrator berhasil diperbarui.");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string } | undefined)
          ?.message;
        setFormError(msg || "Gagal memperbarui kata sandi.");
      } else {
        setFormError("Gagal memperbarui kata sandi.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-8">
      <section>
        <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          Sistem
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Pengaturan Sistem
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Informasi identitas administrator, pembaruan kata sandi, dan pemantauan kesehatan layanan backend.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-6">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">
              Identitas Administrator
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <dt className="text-slate-400">Email</dt>
                <dd className="font-semibold text-slate-900">
                  {profile?.email ?? "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-slate-400">Peran Akses</dt>
                <dd>
                  <StatusBadge
                    label={
                      profile?.role === "superadmin" ? "Superadmin" : "Admin"
                    }
                    tone={profile?.role === "superadmin" ? "blue" : "slate"}
                  />
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">
              Ubah Kata Sandi Admin
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Gunakan kata sandi kuat minimal 8 karakter.
            </p>

            {formError && (
              <p
                role="alert"
                className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
              >
                {formError}
              </p>
            )}
            {formSuccess && (
              <p
                role="status"
                className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"
              >
                {formSuccess}
              </p>
            )}

            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="current-password"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Kata Sandi Saat Ini
                </label>
                <input
                  id="current-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Kata Sandi Baru
                </label>
                <input
                  id="new-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-xs font-semibold text-slate-600"
                >
                  Konfirmasi Kata Sandi Baru
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Menyimpan…" : "Perbarui Kata Sandi"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <section className="h-fit rounded-xl bg-white p-6 shadow-sm lg:col-span-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Status Operasional Sistem
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Koneksi infrastruktur backend dan total rekaman aktif.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoadError(null);
                setRetryKey((k) => k + 1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Segarkan
            </button>
          </div>

          {loadError ? (
            <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
              {loadError}
            </div>
          ) : !system ? (
            <div className="mt-6 space-y-3" aria-label="Memuat status sistem">
              <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-28 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : (
            <>
              <ul className="mt-5 divide-y divide-slate-100 text-sm">
                <li className="flex items-center justify-between py-3">
                  <span className="font-medium text-slate-700">
                    Koneksi Database MySQL
                  </span>
                  <StatusBadge
                    label={
                      system.database === "connected"
                        ? "Terhubung"
                        : "Terputus"
                    }
                    tone={system.database === "connected" ? "green" : "rose"}
                  />
                </li>
                <li className="flex items-center justify-between py-3">
                  <span className="font-medium text-slate-700">
                    Local Disk Storage
                  </span>
                  <StatusBadge
                    label={system.storage_writable ? "Writable" : "Read-only"}
                    tone={system.storage_writable ? "green" : "amber"}
                  />
                </li>
                <li className="flex items-center justify-between py-3">
                  <span className="font-medium text-slate-700">Waktu Server</span>
                  <span className="font-mono text-xs text-slate-500">
                    {system.app_time}
                  </span>
                </li>
              </ul>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  Ringkasan Volume Database
                </h4>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { label: "Mahasiswa", value: system.totals.users },
                    { label: "Marketplace", value: system.totals.marketplace },
                    { label: "Jasa", value: system.totals.services },
                    { label: "Lost & Found", value: system.totals.lost_found },
                    { label: "Event", value: system.totals.events },
                    {
                      label: "Laporan Pending",
                      value: system.totals.reports_pending,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                    >
                      <p className="text-[11px] font-medium text-slate-500">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {formatNumber(stat.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
