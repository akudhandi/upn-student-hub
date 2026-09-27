"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableEmpty, TableError, TableLoading } from "@/components/admin-ui";

type Announcement = {
  id: number;
  title: string;
  message: string;
  target_role: string;
  created_at: string;
};

type AnnouncementListResponse = {
  message: string;
  data: { current_page: number; last_page: number; total: number; data: Announcement[] };
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadItems = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiFetch<AnnouncementListResponse>("/v1/admin/announcements");
      if (signal?.aborted) return;
      setItems(res.data.data);
    } catch {
      if (signal?.aborted) return;
      setItems([]);
      setError("Gagal memuat riwayat pengumuman.");
    } finally {
      if (signal?.aborted) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch must populate state on mount
    void loadItems(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadItems]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFormError("Judul dan isi pesan wajib diisi.");
      return;
    }
    try {
      setSending(true);
      setFormError(null);
      setFormSuccess(null);
      await apiFetch("/v1/admin/announcements", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), message: message.trim(), target_role: target }),
      });
      setTitle("");
      setMessage("");
      setTarget("all");
      setFormSuccess("Pengumuman berhasil dikirim.");
      void loadItems();
    } catch {
      setFormError("Gagal mengirim pengumuman. Coba lagi.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Hapus pengumuman ini?")) return;
    try {
      await apiFetch(`/v1/admin/announcements/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setFormError("Gagal menghapus pengumuman. Coba lagi.");
    }
  }

  return (
    <div>
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-[26px]">Notifications</h1>
        <p className="mt-1 max-w-[600px] text-sm text-slate-500">
          Kirim pengumuman MVP ke mahasiswa dan kelola riwayat pengumuman.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section aria-label="Kirim pengumuman" className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-[15px] font-bold text-slate-900">Pengumuman Baru</h2>
          <form onSubmit={(e) => void handleSend(e)} className="mt-4 space-y-4">
            {formError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {formSuccess}
              </div>
            )}
            <div>
              <Label htmlFor="announcement-title">Judul</Label>
              <Input id="announcement-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Maintenance terjadwal…" className="mt-1.5" maxLength={255} />
            </div>
            <div>
              <Label htmlFor="announcement-message">Isi pesan</Label>
              <textarea
                id="announcement-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="Tulis isi pengumuman untuk mahasiswa…"
                className="mt-1.5 flex min-h-[120px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </div>
            <div>
              <Label htmlFor="announcement-target">Target penerima</Label>
              <select
                id="announcement-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                <option value="all">Semua pengguna</option>
                <option value="student">Mahasiswa saja</option>
              </select>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={sending}>{sending ? "Mengirim…" : "Kirim Pengumuman"}</Button>
            </div>
          </form>
        </section>

        <section aria-label="Riwayat pengumuman" className="h-fit rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-[15px] font-bold text-slate-900">Riwayat</h2>
          <div className="mt-3">
            {isLoading ? (
              <TableLoading label="Memuat riwayat pengumuman" columns={2} />
            ) : error ? (
              <TableError message={error} onRetry={() => void loadItems()} />
            ) : items.length === 0 ? (
              <TableEmpty title="Belum ada pengumuman" description="Pengumuman yang dikirim akan tampil di sini." />
            ) : (
              <ul className="max-h-[480px] space-y-2 overflow-y-auto">
                {items.map((a) => (
                  <li key={a.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-slate-900">{a.title}</p>
                      <button
                        type="button"
                        onClick={() => void handleDelete(a.id)}
                        aria-label={`Hapus pengumuman ${a.title}`}
                        className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2342]"
                      >
                        Hapus
                      </button>
                    </div>
                    <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-600">{a.message}</p>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {a.target_role === "all" ? "Semua pengguna" : "Mahasiswa"} • {formatDateTime(a.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
