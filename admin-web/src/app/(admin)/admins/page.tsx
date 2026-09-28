"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import EmptyState from "@/components/admin/EmptyState";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  createAdmin,
  deleteAdmin,
  getAdmins,
  type AdminAccount,
} from "@/lib/admin-api";
import { getStoredAdmin } from "@/lib/auth";

const LOAD_ERROR =
  "Gagal memuat daftar admin. Pastikan backend berjalan lalu coba lagi.";

function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const message = (err.response?.data as { message?: string } | undefined)
      ?.message;
    if (status === 403) {
      return "Akses ditolak. Hanya superadmin yang dapat mengelola admin.";
    }
    if (message) return message;
    if (!err.response) {
      return "Tidak dapat menghubungi server. Pastikan backend berjalan.";
    }
  }
  return fallback;
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<AdminAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isSuperadmin = getStoredAdmin()?.role === "superadmin";

  const load = useCallback(async () => {
    try {
      const result = await getAdmins();
      setAdmins(result.data);
    } catch (err) {
      setError(errorMessage(err, LOAD_ERROR));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAdmins().then(
      (result) => {
        if (!cancelled) setAdmins(result.data);
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err, LOAD_ERROR));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await createAdmin({ email: email.trim(), password, role });
      setEmail("");
      setPassword("");
      setRole("admin");
      await load();
    } catch (err) {
      setFormError(errorMessage(err, "Gagal menambah admin. Coba lagi."));
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    if (!confirm) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteAdmin(confirm.id);
      setConfirm(null);
      await load();
    } catch (err) {
      setActionError(errorMessage(err, "Gagal menghapus admin. Coba lagi."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-8">
      <section>
        <p className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">
          Sistem
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Kelola Admin
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Tambah dan hapus akun administrator portal. Khusus superadmin.
        </p>
      </section>

      {actionError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
        >
          {actionError}
        </p>
      )}

      {isSuperadmin && (
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Tambah Admin</h3>
          {formError && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
            >
              {formError}
            </p>
          )}
          <form
            onSubmit={handleSubmit}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div>
              <label
                htmlFor="admin-email"
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@upnjatim.ac.id"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                Kata sandi (min. 8)
              </label>
              <input
                id="admin-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
            <div>
              <label
                htmlFor="admin-role"
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                Peran
              </label>
              <select
                id="admin-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              >
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Menyimpan…" : "Tambah"}
              </button>
            </div>
          </form>
        </section>
      )}

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
        ) : !admins ? (
          <div className="space-y-3 p-4" aria-label="Memuat admin">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : admins.length === 0 ? (
          <EmptyState
            title="Belum ada admin"
            message="Tambah akun administrator lewat formulir di atas."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  <th className="px-4 py-3.5 font-medium">Email</th>
                  <th className="px-4 py-3.5 font-medium">Peran</th>
                  <th className="px-4 py-3.5 font-medium">Terdaftar</th>
                  {isSuperadmin && (
                    <th className="px-4 py-3.5 text-right font-medium">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {admins.map((admin) => (
                  <tr key={admin.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {admin.email}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge
                        label={
                          admin.role === "superadmin" ? "Superadmin" : "Admin"
                        }
                        tone={admin.role === "superadmin" ? "blue" : "slate"}
                      />
                    </td>
                    <td className="px-4 py-4 text-xs whitespace-nowrap text-slate-400">
                      {new Date(admin.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    {isSuperadmin && (
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setConfirm(admin)}
                          title="Hapus admin"
                          aria-label={`Hapus ${admin.email}`}
                          className="rounded p-1.5 text-rose-600 transition hover:bg-rose-500/15"
                        >
                          <svg
                            className="h-[18px] w-[18px]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                            />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirm && (
        <ConfirmDialog
          title="Hapus admin?"
          message={`Akun ${confirm.email} tidak bisa login lagi. Tindakan ini tidak dapat dibatalkan.`}
          confirmLabel="Hapus"
          danger
          busy={busy}
          onConfirm={handleConfirm}
          onCancel={() => {
            if (!busy) setConfirm(null);
          }}
        />
      )}
    </main>
  );
}
