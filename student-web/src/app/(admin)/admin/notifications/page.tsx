"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AdminMetricCard,
  AdminPageHeader,
  MetricIcon,
  StatusPill,
  TableEmpty,
  TableError,
  TableLoading,
} from "@/components/admin-ui";

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
  const [total, setTotal] = useState(0);
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
      setTotal(res.data.total);
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
      setTotal((prev) => Math.max(0, prev - 1));
    } catch {
      setFormError("Gagal menghapus pengumuman. Coba lagi.");
    }
  }

  function focusForm() {
    document.getElementById("notifikasi-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => document.getElementById("announcement-title")?.focus(), 350);
  }

  function scrollToHistory() {
    document.getElementById("notifikasi-riwayat")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const targetAll = items.filter((a) => a.target_role === "all").length;
  const targetStudent = items.length - targetAll;

  return (
    <div>
      <AdminPageHeader
        title="Notifikasi & Pengumuman Sistem"
        subtitle="Kirim pengumuman ke mahasiswa dan kelola riwayat broadcast sistem."
        actions={
          <>
            <button
              type="button"
              onClick={scrollToHistory}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Riwayat Broadcast
            </button>
            <button
              type="button"
              onClick={focusForm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <span aria-hidden="true" className="text-base leading-none">+</span> Buat Notifikasi Baru
            </button>
          </>
        }
      />

      <div className="mb-6 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <AdminMetricCard
          label="Total Notifikasi Terkirim"
          value={total.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 01-3.4 0" /></MetricIcon>}
          iconClass="bg-blue-500/10 text-blue-600"
          accentClass="bg-blue-500"
          footer="akumulasi broadcast"
        />
        <AdminMetricCard
          label="Target Semua Pengguna"
          value={targetAll.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></MetricIcon>}
          iconClass="bg-amber-500/10 text-amber-600"
          accentClass="bg-amber-500"
          footer="dari data dimuat"
        />
        <AdminMetricCard
          label="Target Mahasiswa"
          value={targetStudent.toLocaleString("id-ID")}
          icon={<MetricIcon><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></MetricIcon>}
          iconClass="bg-emerald-500/10 text-emerald-600"
          accentClass="bg-emerald-500"
          footer="dari data dimuat"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section id="notifikasi-form" aria-label="Kirim pengumuman" className="h-fit scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
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

        <section id="notifikasi-riwayat" aria-label="Riwayat pengumuman" className="h-fit scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-bold text-slate-900">Riwayat Broadcast</h2>
            <StatusPill tone="blue">{total} terkirim</StatusPill>
          </div>
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
