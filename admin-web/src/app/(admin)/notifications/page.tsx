"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import EmptyState from "@/components/admin/EmptyState";
import Pagination from "@/components/admin/Pagination";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  getAdminAnnouncements,
  type AnnouncementItem,
  type Paginated,
} from "@/lib/admin-api";

const LOAD_ERROR =
  "Gagal memuat riwayat pengumuman. Pastikan backend berjalan lalu coba lagi.";

export default function NotificationsAdminPage() {
  const [result, setResult] = useState<Paginated<AnnouncementItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState<"all" | "student">("all");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AnnouncementItem | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAdminAnnouncements({ page }).then(
      (data) => {
        if (cancelled) return;
        if (data.data.length === 0 && data.current_page > 1) {
          setPage(data.current_page - 1);
          return;
        }
        setError(null);
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
  }, [page, retryKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFormError("Judul dan isi pengumuman wajib diisi.");
      return;
    }
    setSending(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await createAdminAnnouncement({
        title: title.trim(),
        message: message.trim(),
        target_role: targetRole,
      });
      setTitle("");
      setMessage("");
      setTargetRole("all");
      setFormSuccess("Pengumuman berhasil dikirim ke mahasiswa.");
      setPage(1);
      const data = await getAdminAnnouncements({ page: 1 });
      setResult(data);
    } catch {
      setFormError("Gagal mengirim pengumuman. Coba lagi.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    setFormError(null);
    try {
      await deleteAdminAnnouncement(confirmDelete.id);
      setConfirmDelete(null);
      const data = await getAdminAnnouncements({ page });
      if (data.data.length === 0 && data.current_page > 1) {
        setPage(data.current_page - 1);
      } else {
        setResult(data);
      }
    } catch {
      setFormError("Gagal menghapus pengumuman. Coba lagi.");
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
          Notifications &amp; Pengumuman
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Kirim pengumuman resmi yang tampil di bel notifikasi mahasiswa serta kelola riwayat broadcast.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="h-fit rounded-xl bg-white p-6 shadow-sm lg:col-span-5">
          <h3 className="text-base font-bold text-slate-900">
            Buat Pengumuman Baru
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Pesan akan langsung terbaca melalui menu notifikasi mahasiswa.
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

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="announcement-title"
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                Judul Pengumuman
              </label>
              <input
                id="announcement-title"
                type="text"
                required
                maxLength={255}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pemeliharaan Sistem Malam Ini"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              />
            </div>

            <div>
              <label
                htmlFor="announcement-target"
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                Target Penerima
              </label>
              <select
                id="announcement-target"
                value={targetRole}
                onChange={(e) =>
                  setTargetRole(e.target.value as "all" | "student")
                }
                className="w-full cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              >
                <option value="all">Semua Pengguna</option>
                <option value="student">Khusus Mahasiswa</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="announcement-message"
                className="mb-1.5 block text-xs font-semibold text-slate-600"
              >
                Isi Pesan
              </label>
              <textarea
                id="announcement-message"
                required
                rows={5}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tuliskan isi pengumuman secara ringkas dan jelas…"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {sending ? "Mengirim…" : "Kirim Broadcast"}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl bg-white shadow-sm lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h3 className="text-base font-bold text-slate-900">
              Riwayat Broadcast
            </h3>
            {result && (
              <StatusBadge label={`${result.total} terkirim`} tone="blue" />
            )}
          </div>

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
            <div className="space-y-3 p-4" aria-label="Memuat pengumuman">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-lg bg-slate-100"
                />
              ))}
            </div>
          ) : result.data.length === 0 ? (
            <EmptyState
              title="Belum ada pengumuman"
              message="Pengumuman yang dikirim lewat formulir akan muncul di sini."
            />
          ) : (
            <>
              <ul className="divide-y divide-slate-100">
                {result.data.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">
                          {item.title}
                        </p>
                        <StatusBadge
                          label={
                            item.target_role === "student"
                              ? "Mahasiswa"
                              : "Semua"
                          }
                          tone={
                            item.target_role === "student" ? "green" : "slate"
                          }
                        />
                      </div>
                      <p className="text-sm whitespace-pre-line text-slate-600">
                        {item.message}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(item.created_at).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {item.admin?.email ? ` · oleh ${item.admin.email}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(item)}
                      className="shrink-0 rounded-lg bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-500/25"
                    >
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
              <Pagination
                page={result.current_page}
                lastPage={result.last_page}
                total={result.total}
                onPage={setPage}
              />
            </>
          )}
        </section>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Hapus pengumuman?"
          message={`Pengumuman "${confirmDelete.title}" akan ditarik dan dihapus.`}
          confirmLabel="Hapus"
          danger
          busy={busy}
          onConfirm={handleDelete}
          onCancel={() => {
            if (!busy) setConfirmDelete(null);
          }}
        />
      )}
    </main>
  );
}
