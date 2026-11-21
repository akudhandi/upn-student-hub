"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import Pagination from "@/components/admin/Pagination";
import SelectWrapper from "@/components/admin/SelectWrapper";
import StatusBadge from "@/components/admin/StatusBadge";
import TableState from "@/components/admin/TableState";
import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  getAdminAnnouncements,
  type AnnouncementItem,
  type Paginated,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

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
    const controller = new AbortController();
    getAdminAnnouncements({ page }, { signal: controller.signal }).then(
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
    } catch (err) {
      setFormError(extractAdminError(err, "Gagal mengirim pengumuman. Coba lagi."));
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
    } catch (err) {
      setFormError(extractAdminError(err, "Gagal menghapus pengumuman. Coba lagi."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 p-4 sm:p-8">
      <section>
        <p className="text-xs font-medium text-[#787470]">
          Sistem
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#141416] sm:text-3xl">
          Notifications &amp; Pengumuman
        </h2>
        <p className="mt-1 text-sm text-[#6E6A66]">
          Kirim pengumuman resmi yang tampil di bel notifikasi mahasiswa serta kelola riwayat broadcast.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="h-fit rounded-2xl border border-[#E5E0DA] bg-white p-6 lg:col-span-5">
          <h3 className="font-display text-base font-semibold text-[#141416]">
            Buat Pengumuman Baru
          </h3>
          <p className="mt-1 text-xs text-[#6E6A66]">
            Pesan akan langsung terbaca melalui menu notifikasi mahasiswa.
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

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="announcement-title"
                className="mb-1.5 block text-xs font-semibold text-[#57534E]"
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
                className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
              />
            </div>

            <div>
              <label
                htmlFor="announcement-target"
                className="mb-1.5 block text-xs font-semibold text-[#57534E]"
              >
                Target Penerima
              </label>
              <SelectWrapper>
                <select
                  id="announcement-target"
                  value={targetRole}
                  onChange={(e) =>
                    setTargetRole(e.target.value as "all" | "student")
                  }
                  className="w-full cursor-pointer appearance-none rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] py-2.5 pr-9 pl-3.5 text-sm text-[#141416] outline-none transition focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
                >
                  <option value="all">Semua Pengguna</option>
                  <option value="student">Khusus Mahasiswa</option>
                </select>
              </SelectWrapper>
            </div>

            <div>
              <label
                htmlFor="announcement-message"
                className="mb-1.5 block text-xs font-semibold text-[#57534E]"
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
                className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={sending}
                className="rounded-full bg-[#141416] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#242428] disabled:opacity-60"
              >
                {sending ? "Mengirim…" : "Kirim Broadcast"}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#E5E0DA] bg-white lg:col-span-7">
          <div className="flex items-center justify-between border-b border-[#F2EEEA] px-5 py-4">
            <h3 className="font-display text-base font-semibold text-[#141416]">
              Riwayat Broadcast
            </h3>
            {result && (
              <StatusBadge label={`${result.total} terkirim`} tone="blue" />
            )}
          </div>

          <TableState
            error={error}
            onRetry={() => {
              setError(null);
              setRetryKey((k) => k + 1);
            }}
            loading={!result}
            loadingLabel="Memuat pengumuman"
            skeletonRows={4}
            skeletonHeightClass="h-20"
            empty={Boolean(result && result.data.length === 0)}
            emptyTitle="Belum ada pengumuman"
            emptyMessage="Pengumuman yang dikirim lewat formulir akan muncul di sini."
          >
            {result && (
              <>
                <ul className="divide-y divide-[#F2EEEA]">
                  {result.data.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-[#FAF8F6]"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#141416]">
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
                        <p className="text-sm whitespace-pre-line text-[#57534E]">
                          {item.message}
                        </p>
                        <p className="text-xs text-[#787470]">
                          {formatDateTime(item.created_at)}
                          {item.admin?.email ? ` · oleh ${item.admin.email}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(item)}
                        className="shrink-0 rounded-full bg-[#FDECEC] px-3 py-1 text-xs font-semibold text-[#A62D2D] transition hover:bg-[#FADADA]"
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
          </TableState>
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
