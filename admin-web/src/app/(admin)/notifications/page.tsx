"use client";

import { useEffect, useState } from "react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import Pagination from "@/components/admin/Pagination";
import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  getAdminAnnouncements,
  type AnnouncementItem,
  type Paginated,
} from "@/lib/admin-api";
import { extractAdminError, isAbortError } from "@/lib/api";
import { formatDateTime, formatNumber } from "@/lib/format";

const LOAD_ERROR =
  "Gagal memuat riwayat pengumuman. Pastikan backend berjalan lalu coba lagi.";

const TARGET_OPTIONS: Array<{
  value: "all" | "student";
  label: string;
  hint: string;
}> = [
  {
    value: "all",
    label: "Semua Pengguna",
    hint: "Tampil untuk seluruh mahasiswa serta admin di portal.",
  },
  {
    value: "student",
    label: "Khusus Mahasiswa",
    hint: "Hanya ditujukan ke akun mahasiswa aktif di student hub.",
  },
];

export default function NotificationsAdminPage() {
  const [result, setResult] = useState<Paginated<AnnouncementItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState<"all" | "student">("all");
  const [sending, setSending] = useState(false);
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<AnnouncementItem | null>(
    null,
  );
  const [busyDelete, setBusyDelete] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

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

  function handleRequestSend(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    if (!title.trim() || !message.trim()) {
      setFormError("Judul dan isi pengumuman wajib diisi sebelum mengirim.");
      return;
    }
    setConfirmSendOpen(true);
  }

  async function executeSend() {
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
      setConfirmSendOpen(false);
      setFormSuccess("Pengumuman resmi berhasil dikirim ke notifikasi mahasiswa.");
      setPage(1);
      const data = await getAdminAnnouncements({ page: 1 });
      setResult(data);
    } catch (err) {
      setConfirmSendOpen(false);
      setFormError(
        extractAdminError(err, "Gagal mengirim pengumuman. Coba lagi."),
      );
    } finally {
      setSending(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setBusyDelete(true);
    setHistoryError(null);
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
      setConfirmDelete(null);
      setHistoryError(
        extractAdminError(err, "Gagal menghapus pengumuman. Coba lagi."),
      );
    } finally {
      setBusyDelete(false);
    }
  }

  const targetMeta =
    TARGET_OPTIONS.find((opt) => opt.value === targetRole) ?? TARGET_OPTIONS[0];
  const previewTitle =
    title.trim() || "Contoh: Pemeliharaan Terjadwal Sistem Malam Ini";
  const previewBody =
    message.trim() ||
    "Isi pengumuman Anda akan tampil seperti ini pada bel notifikasi portal mahasiswa.";

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 font-display text-2xl font-semibold tracking-tight [overflow-wrap:break-word] [text-wrap:balance] text-hub-ink sm:text-[28px]">
              Notifications &amp; Pengumuman
            </h1>
            {result && (
              <span
                role="status"
                className="rounded-md bg-hub-sidebar px-2.5 py-1 text-[13px] font-medium tabular-nums text-hub-ink-muted"
              >
                {formatNumber(result.total)} broadcast
              </span>
            )}
          </div>
          <p className="mt-1 max-w-2xl text-[14px] text-hub-ink-muted [text-wrap:pretty]">
            Susun pesan resmi untuk mahasiswa, periksa pratinjau tampilan
            notifikasi, dan kelola riwayat broadcast aktif.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section className="rounded-[20px] border border-hub-border bg-hub-surface p-6 lg:col-span-5">
          <h2 className="font-display text-[17px] font-semibold text-hub-ink">
            Buat Pengumuman Baru
          </h2>
          <p className="mt-1 text-[13px] text-hub-ink-subtle [text-wrap:pretty]">
            Broadcast langsung tampil di bel notifikasi portal mahasiswa setelah
            dikonfirmasi.
          </p>

          {formError && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-hub-danger-border bg-hub-danger-bg px-3.5 py-2.5 text-[13px] font-medium text-hub-danger-ink"
            >
              {formError}
            </p>
          )}
          {formSuccess && (
            <p
              role="status"
              className="mt-4 rounded-xl bg-hub-success-bg px-3.5 py-2.5 text-[13px] font-medium text-hub-success-ink"
            >
              {formSuccess}
            </p>
          )}

          <form onSubmit={handleRequestSend} className="mt-5 space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="announcement-title"
                  className="text-[13px] font-semibold text-hub-ink"
                >
                  Judul Pengumuman
                </label>
                <span className="text-[13px] tabular-nums text-hub-ink-subtle">
                  {title.length}/255
                </span>
              </div>
              <input
                id="announcement-title"
                name="title"
                type="text"
                required
                maxLength={255}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Pemeliharaan Sistem Malam Ini"
                className="h-10 w-full rounded-xl border border-hub-border bg-hub-subtle px-3.5 text-[14px] text-hub-ink outline-2 -outline-offset-2 outline-transparent transition-colors duration-150 placeholder:text-hub-ink-subtle hover:bg-hub-surface-tint focus:border-hub-ink-muted focus:bg-hub-surface focus-visible:outline-hub-focus"
              />
            </div>

            <div>
              <span className="mb-1.5 block text-[13px] font-semibold text-hub-ink">
                Target Penerima
              </span>
              <div
                role="radiogroup"
                aria-label="Target penerima pengumuman"
                className="grid grid-cols-2 gap-2"
              >
                {TARGET_OPTIONS.map((opt) => {
                  const selected = targetRole === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={sending}
                      onClick={() => setTargetRole(opt.value)}
                      className={`flex h-10 items-center justify-center rounded-xl border px-3 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55 ${
                        selected
                          ? "border-hub-ink bg-hub-ink text-hub-surface"
                          : "border-hub-border bg-hub-subtle text-hub-ink hover:bg-hub-surface-tint"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[13px] text-hub-ink-subtle [text-wrap:pretty]">
                {targetMeta.hint}
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="announcement-message"
                  className="text-[13px] font-semibold text-hub-ink"
                >
                  Isi Pesan
                </label>
                <span className="text-[13px] tabular-nums text-hub-ink-subtle">
                  {message.length}/2000
                </span>
              </div>
              <textarea
                id="announcement-message"
                name="message"
                required
                rows={5}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tuliskan isi pengumuman secara ringkas dan jelas…"
                className="w-full rounded-xl border border-hub-border bg-hub-subtle px-3.5 py-2.5 text-[14px] text-hub-ink outline-2 -outline-offset-2 outline-transparent transition-colors duration-150 placeholder:text-hub-ink-subtle hover:bg-hub-surface-tint focus:border-hub-ink-muted focus:bg-hub-surface focus-visible:outline-hub-focus"
              />
            </div>

            <div className="border-t border-hub-rule pt-4">
              <p className="text-[13px] font-semibold text-hub-ink-muted">
                Pratinjau di Notifikasi Mahasiswa
              </p>
              <div className="mt-2 rounded-xl bg-hub-subtle p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hub-ink text-hub-surface">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                      />
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[13px] font-medium ${
                          targetRole === "student"
                            ? "bg-hub-success-bg text-hub-success-ink"
                            : "bg-hub-accent-soft text-hub-accent-ink"
                        }`}
                      >
                        {targetMeta.label}
                      </span>
                      <span className="text-[13px] text-hub-ink-subtle">
                        Baru saja
                      </span>
                    </div>
                    <h3
                      className={`mt-1.5 font-display text-[15px] font-semibold [overflow-wrap:break-word] ${
                        title.trim() ? "text-hub-ink" : "text-hub-ink-subtle"
                      }`}
                    >
                      {previewTitle}
                    </h3>
                    <p
                      className={`mt-1 text-[13px] leading-relaxed whitespace-pre-line ${
                        message.trim()
                          ? "text-hub-ink-muted"
                          : "text-hub-ink-subtle"
                      }`}
                    >
                      {previewBody}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex h-10 w-full items-center justify-center rounded-full bg-hub-ink px-5 text-[13px] font-semibold whitespace-nowrap text-hub-surface transition-colors duration-150 hover:bg-hub-ink-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
              >
                {sending ? "Mengirim…" : "Kirim Broadcast"}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-[20px] border border-hub-border bg-hub-surface lg:col-span-7">
          <div className="flex items-center justify-between gap-3 border-b border-hub-rule px-6 py-4">
            <div>
              <h2 className="font-display text-[17px] font-semibold text-hub-ink">
                Riwayat Broadcast
              </h2>
              <p className="mt-0.5 text-[13px] text-hub-ink-subtle">
                Daftar pengumuman resmi yang sedang atau pernah ditayangkan.
              </p>
            </div>
            {result && (
              <span className="shrink-0 rounded-md bg-hub-accent-soft px-2.5 py-1 text-[13px] font-medium tabular-nums text-hub-accent-ink">
                {formatNumber(result.total)} terkirim
              </span>
            )}
          </div>

          {historyError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 border-b border-hub-danger-border bg-hub-danger-bg px-6 py-3 text-[13px] font-medium text-hub-danger-ink"
            >
              <span>{historyError}</span>
              <button
                type="button"
                onClick={() => setHistoryError(null)}
                className="shrink-0 rounded-full border border-hub-danger-border bg-hub-surface px-3 py-1 text-[13px] font-semibold whitespace-nowrap text-hub-danger-ink transition-colors duration-150 hover:bg-hub-subtle active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
              >
                Tutup
              </button>
            </div>
          )}

          {error ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <p
                role="alert"
                className="text-[14px] font-medium text-hub-danger-ink"
              >
                {error}
              </p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setRetryKey((k) => k + 1);
                }}
                className="inline-flex h-10 items-center rounded-full bg-hub-ink px-4 text-[13px] font-semibold whitespace-nowrap text-hub-surface transition-colors duration-150 hover:bg-hub-ink-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
              >
                Coba lagi
              </button>
            </div>
          ) : !result ? (
            <div
              className="divide-y divide-hub-rule"
              aria-label="Memuat pengumuman"
            >
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="space-y-2.5 px-6 py-4">
                  <div className="h-4 w-52 animate-pulse rounded bg-hub-sidebar" />
                  <div className="h-10 w-full animate-pulse rounded bg-hub-subtle" />
                  <div className="h-3.5 w-36 animate-pulse rounded bg-hub-subtle" />
                </div>
              ))}
            </div>
          ) : result.data.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <h3 className="font-display text-[16px] font-semibold text-hub-ink">
                Belum ada pengumuman
              </h3>
              <p className="mx-auto mt-1 max-w-md text-[14px] text-hub-ink-subtle [text-wrap:pretty]">
                Pengumuman yang Anda kirim melalui formulir di sebelah kiri
                akan tercatat di riwayat ini.
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-hub-rule">
                {result.data.map((item) => {
                  const isStudentOnly = item.target_role === "student";
                  return (
                    <li
                      key={item.id}
                      className="flex flex-col justify-between gap-4 px-6 py-4 transition-colors duration-150 hover:bg-hub-subtle sm:flex-row sm:items-start"
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-[15px] font-semibold text-hub-ink">
                            {item.title}
                          </h3>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[13px] font-medium whitespace-nowrap ${
                              isStudentOnly
                                ? "bg-hub-success-bg text-hub-success-ink"
                                : "bg-hub-sidebar text-hub-ink-muted"
                            }`}
                          >
                            {isStudentOnly ? "Mahasiswa" : "Semua"}
                          </span>
                        </div>

                        <p className="text-[14px] leading-relaxed whitespace-pre-line text-hub-ink-muted">
                          {item.message}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-hub-ink-subtle">
                          <span>{formatDateTime(item.created_at)}</span>
                          {item.admin?.email && (
                            <span>Dikirim oleh {item.admin.email}</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setConfirmDelete(item)}
                        className="inline-flex h-9 shrink-0 self-start items-center rounded-full border border-hub-danger-border bg-hub-danger-bg px-3.5 text-[13px] font-semibold whitespace-nowrap text-hub-danger-ink transition-colors duration-150 hover:bg-hub-danger-solid hover:text-hub-surface active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hub-focus"
                      >
                        Tarik &amp; Hapus
                      </button>
                    </li>
                  );
                })}
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

      {confirmSendOpen && (
        <ConfirmDialog
          title="Kirim broadcast pengumuman?"
          message={`Pengumuman "${title.trim()}" akan langsung dikirim ke ${targetMeta.label.toLowerCase()}.`}
          confirmLabel="Kirim Sekarang"
          busy={sending}
          onConfirm={executeSend}
          onCancel={() => {
            if (!sending) setConfirmSendOpen(false);
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Tarik & hapus pengumuman?"
          message={`Pengumuman "${confirmDelete.title}" akan ditarik dari daftar notifikasi mahasiswa.`}
          confirmLabel="Hapus"
          danger
          busy={busyDelete}
          onConfirm={handleDelete}
          onCancel={() => {
            if (!busyDelete) setConfirmDelete(null);
          }}
        />
      )}
    </main>
  );
}
