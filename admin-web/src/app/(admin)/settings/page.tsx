"use client";

import { useEffect, useState } from "react";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  getAdminProfile,
  getAdminSystemStatus,
  updateAdminPassword,
  type SystemStatusData,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";
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
    const controller = new AbortController();
    Promise.all([
      getAdminProfile({ signal: controller.signal }).catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) throw err;
        return null;
      }),
      getAdminSystemStatus({ signal: controller.signal }),
    ]).then(
      ([prof, sys]) => {
        if (controller.signal.aborted) return;
        setLoadError(null);
        if (prof) setProfile(prof);
        setSystem(sys);
      },
      (err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setLoadError(
          "Gagal memuat status sistem. Pastikan backend berjalan lalu coba lagi.",
        );
      },
    );
    return () => {
      controller.abort();
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
      setFormError(extractAdminError(err, "Gagal memperbarui kata sandi."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-8">
      <section>
        <p className="text-xs font-medium text-[#787470]">
          Sistem
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141416] sm:text-3xl">
          Pengaturan Sistem
        </h2>
        <p className="mt-1 text-sm text-[#6E6A66]">
          Informasi identitas administrator, pembaruan kata sandi, dan pemantauan kesehatan layanan backend.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-6">
          <section className="rounded-2xl border border-[#E5E0DA] bg-white p-6">
            <h3 className="font-display text-base font-semibold text-[#141416]">
              Identitas Administrator
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-[#F2EEEA] pb-3">
                <dt className="text-[#787470]">Email</dt>
                <dd className="font-semibold text-[#141416]">
                  {profile?.email ?? "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#787470]">Peran Akses</dt>
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

          <section className="rounded-2xl border border-[#E5E0DA] bg-white p-6">
            <h3 className="font-display text-base font-semibold text-[#141416]">
              Ubah Kata Sandi Admin
            </h3>
            <p className="mt-1 text-xs text-[#6E6A66]">
              Gunakan kata sandi kuat minimal 8 karakter.
            </p>

            {formError && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-[#F3C6C6] bg-[#FDECEC] px-3 py-2 text-xs font-medium text-[#A62D2D]"
              >
                {formError}
              </p>
            )}
            {formSuccess && (
              <p
                role="status"
                className="mt-4 rounded-xl border border-[#C6E4D2] bg-[#E4F2EA] px-3 py-2 text-xs font-medium text-[#226A46]"
              >
                {formSuccess}
              </p>
            )}

            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="current-password"
                  className="mb-1.5 block text-xs font-semibold text-[#57534E]"
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
                  className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 text-sm text-[#141416] outline-none transition focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1.5 block text-xs font-semibold text-[#57534E]"
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
                  className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 text-sm text-[#141416] outline-none transition focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-xs font-semibold text-[#57534E]"
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
                  className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 text-sm text-[#141416] outline-none transition focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#141416] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#242428] disabled:opacity-60"
                >
                  {saving ? "Menyimpan…" : "Perbarui Kata Sandi"}
                </button>
              </div>
            </form>
          </section>
        </div>

        <section className="h-fit rounded-2xl border border-[#E5E0DA] bg-white p-6 lg:col-span-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-semibold text-[#141416]">
                Status Operasional Sistem
              </h3>
              <p className="mt-0.5 text-xs text-[#6E6A66]">
                Koneksi infrastruktur backend dan total rekaman aktif.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLoadError(null);
                setRetryKey((k) => k + 1);
              }}
              className="rounded-full border border-[#DFD9D2] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#141416] transition hover:border-[#CFC8BF] hover:bg-[#FAF8F6]"
            >
              Segarkan
            </button>
          </div>

          {loadError ? (
            <div className="mt-6 rounded-xl border border-[#F3C6C6] bg-[#FDECEC] p-4 text-sm font-medium text-[#A62D2D]">
              {loadError}
            </div>
          ) : !system ? (
            <div className="mt-6 space-y-3" aria-label="Memuat status sistem">
              <div className="h-12 animate-pulse rounded-xl bg-[#EFECE8]" />
              <div className="h-12 animate-pulse rounded-xl bg-[#EFECE8]" />
              <div className="h-28 animate-pulse rounded-xl bg-[#EFECE8]" />
            </div>
          ) : (
            <>
              <ul className="mt-5 divide-y divide-[#F2EEEA] text-sm">
                <li className="flex items-center justify-between py-3">
                  <span className="font-medium text-[#57534E]">
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
                  <span className="font-medium text-[#57534E]">
                    Local Disk Storage
                  </span>
                  <StatusBadge
                    label={system.storage_writable ? "Writable" : "Read-only"}
                    tone={system.storage_writable ? "green" : "amber"}
                  />
                </li>
                <li className="flex items-center justify-between py-3">
                  <span className="font-medium text-[#57534E]">Waktu Server</span>
                  <span className="font-mono text-xs text-[#6E6A66]">
                    {system.app_time}
                  </span>
                </li>
              </ul>

              <div className="mt-5 border-t border-[#F2EEEA] pt-4">
                <h4 className="text-xs font-semibold tracking-wider text-[#787470] uppercase">
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
                      className="rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] p-3"
                    >
                      <p className="text-[11px] font-medium text-[#6E6A66]">
                        {stat.label}
                      </p>
                      <p className="mt-1 font-display text-lg font-semibold text-[#141416]">
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
