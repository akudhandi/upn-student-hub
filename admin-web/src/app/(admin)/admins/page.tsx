"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ActionIcon } from "@/components/admin/ActionIcons";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import SelectWrapper from "@/components/admin/SelectWrapper";
import StatusBadge from "@/components/admin/StatusBadge";
import TableState from "@/components/admin/TableState";
import {
  createAdmin,
  deleteAdmin,
  getAdmins,
  type AdminAccount,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";
import {
  getAdminSessionSnapshot,
  getServerAdminSessionSnapshot,
  parseAdminSession,
  subscribeAdminSession,
} from "@/lib/auth";
import { formatDate } from "@/lib/format";

const LOAD_ERROR =
  "Gagal memuat daftar admin. Pastikan backend berjalan lalu coba lagi.";

const ADMIN_ERROR_OPTIONS = {
  statusMessages: {
    403: "Akses ditolak. Hanya superadmin yang dapat mengelola admin.",
  },
};

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

  const sessionSnapshot = useSyncExternalStore(
    subscribeAdminSession,
    getAdminSessionSnapshot,
    getServerAdminSessionSnapshot,
  );
  const currentAdmin = parseAdminSession(sessionSnapshot)?.admin ?? null;
  const isSuperadmin = currentAdmin?.role === "superadmin";

  const load = useCallback(async () => {
    if (!isSuperadmin) return;
    try {
      const result = await getAdmins();
      setError(null);
      setAdmins(result.data);
    } catch (err) {
      setError(extractAdminError(err, LOAD_ERROR, ADMIN_ERROR_OPTIONS));
    }
  }, [isSuperadmin]);

  useEffect(() => {
    if (!isSuperadmin) return;
    const controller = new AbortController();
    getAdmins({ signal: controller.signal }).then(
      (result) => {
        if (!controller.signal.aborted) {
          setError(null);
          setAdmins(result.data);
        }
      },
      (err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setError(extractAdminError(err, LOAD_ERROR, ADMIN_ERROR_OPTIONS));
      },
    );
    return () => {
      controller.abort();
    };
  }, [isSuperadmin, retryKey]);

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
      setFormError(
        extractAdminError(
          err,
          "Gagal menambah admin. Coba lagi.",
          ADMIN_ERROR_OPTIONS,
        ),
      );
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
      setActionError(
        extractAdminError(
          err,
          "Gagal menghapus admin. Coba lagi.",
          ADMIN_ERROR_OPTIONS,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  if (!isSuperadmin) {
    return (
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-8">
        <section>
          <p className="text-xs font-medium text-[#787470]">
            Sistem
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141416] sm:text-3xl">
            Kelola Admin
          </h2>
          <p className="mt-1 text-sm text-[#6E6A66]">
            Tambah dan hapus akun administrator portal. Khusus superadmin.
          </p>
        </section>

        <section
          role="alert"
          className="rounded-2xl border border-[#E6CFAF] bg-[#FBEAD8] p-5 text-sm font-medium text-[#8E581A]"
        >
          Akses ditolak. Hanya superadmin yang dapat melihat dan mengelola akun
          administrator.
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-8">
      <section>
        <p className="text-xs font-medium text-[#787470]">
          Sistem
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141416] sm:text-3xl">
          Kelola Admin
        </h2>
        <p className="mt-1 text-sm text-[#6E6A66]">
          Tambah dan hapus akun administrator portal. Khusus superadmin.
        </p>
      </section>

      {actionError && (
        <p
          role="alert"
          className="rounded-xl border border-[#F3C6C6] bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#A62D2D]"
        >
          {actionError}
        </p>
      )}

      {isSuperadmin && (
        <section className="rounded-2xl border border-[#E5E0DA] bg-white p-5">
          <h3 className="font-display text-sm font-semibold text-[#141416]">Tambah Admin</h3>
          {formError && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-[#F3C6C6] bg-[#FDECEC] px-3 py-2 text-sm font-medium text-[#A62D2D]"
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
                className="mb-1.5 block text-xs font-semibold text-[#57534E]"
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
                className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3 py-2 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
              />
            </div>
            <div>
              <label
                htmlFor="admin-password"
                className="mb-1.5 block text-xs font-semibold text-[#57534E]"
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
                className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3 py-2 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
              />
            </div>
            <div>
              <label
                htmlFor="admin-role"
                className="mb-1.5 block text-xs font-semibold text-[#57534E]"
              >
                Peran
              </label>
              <SelectWrapper>
                <select
                  id="admin-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] py-2 pr-9 pl-3 text-sm text-[#141416] outline-none transition focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </SelectWrapper>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-[#141416] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#242428] disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Menyimpan…" : "Tambah"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#E5E0DA] bg-white">
        <TableState
          error={error}
          onRetry={() => {
            setError(null);
            setRetryKey((k) => k + 1);
          }}
          loading={!admins}
          loadingLabel="Memuat admin"
          skeletonRows={3}
          skeletonHeightClass="h-14"
          empty={Boolean(admins && admins.length === 0)}
          emptyTitle="Belum ada admin"
          emptyMessage="Tambah akun administrator lewat formulir di atas."
        >
          {admins && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#F2EEEA] bg-[#FAF8F6] text-xs font-semibold tracking-wider text-[#6E6A66] uppercase">
                    <th className="px-4 py-3.5 font-medium">Email</th>
                    <th className="px-4 py-3.5 font-medium">Peran</th>
                    <th className="px-4 py-3.5 font-medium">Terdaftar</th>
                    {isSuperadmin && (
                      <th className="px-4 py-3.5 text-right font-medium">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2EEEA] text-sm">
                  {admins.map((admin) => (
                    <tr key={admin.id} className="transition hover:bg-[#FAF8F6]">
                      <td className="px-4 py-4 font-medium text-[#141416]">
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
                      <td className="px-4 py-4 text-xs whitespace-nowrap text-[#787470]">
                        {formatDate(admin.created_at)}
                      </td>
                      {isSuperadmin && (
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setConfirm(admin)}
                            title="Hapus admin"
                            aria-label={`Hapus ${admin.email}`}
                            className="rounded-lg p-1.5 text-[#C53939] transition hover:bg-[#FDECEC]"
                          >
                            <ActionIcon name="trash" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TableState>
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
