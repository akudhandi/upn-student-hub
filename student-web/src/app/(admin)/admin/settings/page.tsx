"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminPageHeader, StatusPill, TableError, TableLoading } from "@/components/admin-ui";

type AdminProfile = { id: number; email: string; role: string; created_at: string };

type SystemStatus = {
  app_time: string;
  database: string;
  storage_writable: boolean;
  totals: Record<string, number>;
};

function Indicator({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2 text-[13px] font-medium text-slate-800">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
        {label}
      </span>
      <StatusPill tone={ok ? "green" : "red"}>{detail}</StatusPill>
    </li>
  );
}

export default function AdminSettingsPage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadAll = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const [profileRes, systemRes] = await Promise.all([
        apiFetch<{ message: string; data: AdminProfile }>("/v1/admin/profile"),
        apiFetch<{ message: string; data: SystemStatus }>("/v1/admin/system-status"),
      ]);
      if (signal?.aborted) return;
      setProfile(profileRes.data);
      setSystem(systemRes.data);
    } catch {
      if (signal?.aborted) return;
      setError("Gagal memuat pengaturan. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch must populate state on mount
    void loadAll(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadAll]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setFormError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Konfirmasi password tidak cocok.");
      return;
    }
    try {
      setSaving(true);
      setFormError(null);
      setFormSuccess(null);
      await apiFetch("/v1/admin/profile/password", {
        method: "PATCH",
        body: JSON.stringify({
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFormSuccess("Password berhasil diperbarui.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Gagal memperbarui password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Pengaturan Sistem"
        subtitle="Profil admin, keamanan akun, dan status operasional sistem."
      />

      {isLoading ? (
        <div className="mt-6"><TableLoading label="Memuat pengaturan" columns={2} /></div>
      ) : error ? (
        <div className="mt-6"><TableError message={error} onRetry={() => void loadAll()} /></div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <section aria-label="Informasi admin" className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <h2 className="text-[15px] font-bold text-slate-900">Informasi & Identitas Admin</h2>
              <dl className="mt-3 grid grid-cols-1 gap-2.5 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-900">{profile?.email ?? "-"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Role</dt><dd className="font-medium text-slate-900">{profile?.role ?? "-"}</dd></div>
              </dl>
            </section>

            <section aria-label="Keamanan akun" className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <h2 className="text-[15px] font-bold text-slate-900">Keamanan</h2>
              <p className="mt-0.5 text-xs text-slate-500">Perbarui password akun administrator.</p>
              <form onSubmit={(e) => void handlePasswordChange(e)} className="mt-4 space-y-3">
                {formError && (
                  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>
                )}
                {formSuccess && (
                  <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{formSuccess}</div>
                )}
                <div>
                  <Label htmlFor="current-password">Password saat ini</Label>
                  <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1.5" autoComplete="current-password" />
                </div>
                <div>
                  <Label htmlFor="new-password">Password baru (min. 8 karakter)</Label>
                  <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1.5" autoComplete="new-password" />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Konfirmasi password baru</Label>
                  <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1.5" autoComplete="new-password" />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Perbarui Password"}</Button>
                </div>
              </form>
            </section>
          </div>

          <section aria-label="Status operasional sistem" className="h-fit rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h2 className="text-[15px] font-bold text-slate-900">Sistem</h2>
            <p className="mt-0.5 text-xs text-slate-500">Status operasional dan ringkasan data platform.</p>
            <ul className="mt-2 divide-y divide-slate-100">
              <Indicator ok={system?.database === "connected"} label="Database" detail={system?.database === "connected" ? "Connected" : "Down"} />
              <Indicator ok={system?.storage_writable === true} label="Local storage" detail={system?.storage_writable ? "Writable" : "Error"} />
              <Indicator ok={(system?.totals.reports_pending ?? 1) === 0} label="Antrian moderasi" detail={`${system?.totals.reports_pending ?? "?"} pending`} />
            </ul>
            {system && Object.keys(system.totals).length > 0 && (
              <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                {Object.entries(system.totals).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <dt className="truncate text-xs text-slate-500">{key.replace(/_/g, " ")}</dt>
                    <dd className="text-[13px] font-bold text-slate-900">{value.toLocaleString("id-ID")}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-3 text-[11px] text-slate-400">Waktu server: {system?.app_time ?? "-"}</p>
          </section>
        </div>
      )}
    </div>
  );
}
