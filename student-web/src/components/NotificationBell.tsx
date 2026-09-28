"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type AnnouncementItem = {
  id: number;
  title: string;
  message: string;
  target_role: string;
  created_at: string;
};

type AnnouncementListResponse = {
  message: string;
  data: AnnouncementItem[];
};

const LAST_SEEN_KEY = "upnhub_last_seen_announcement";

function readLastSeen(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(LAST_SEEN_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAnnouncementTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const clock = date
    .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    .replace(":", ".");
  if (date.toDateString() === now.toDateString()) return `Hari ini ${clock}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Kemarin ${clock}`;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NotificationBell() {
  const [items, setItems] = useState<AnnouncementItem[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(() => readLastSeen());

  // Muat pengumuman terbaru saat header dipasang.
  useEffect(() => {
    let cancelled = false;
    apiFetch<AnnouncementListResponse>("/v1/announcements?limit=20").then(
      (res) => {
        if (!cancelled) setItems(res.data);
      },
      () => {
        // Bel diam saat backend tidak terjangkau; tanpa error mencolok.
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Tutup dropdown dengan Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const unreadCount = items.filter((item) => item.id > lastSeen).length;

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && items.length > 0) {
      const maxId = Math.max(...items.map((item) => item.id));
      setLastSeen(maxId);
      try {
        window.localStorage.setItem(LAST_SEEN_KEY, String(maxId));
      } catch {
        // Penyimpanan privat: abaikan, dot tampil lagi saat reload.
      }
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={
          unreadCount > 0
            ? `Notifikasi, ${unreadCount} belum dibaca`
            : "Notifikasi"
        }
        aria-expanded={open}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-50 hover:text-slate-700"
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 2.5C5.7 2.5 4 4 4 6V10L3 11.5H13L12 10V6C12 4 10.3 2.5 8 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M6.5 13C6.5 13.8 7.1 14.5 8 14.5C8.9 14.5 9.5 13.8 9.5 13H6.5Z" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
        )}
      </button>

      {open && (
        <>
          <button
            aria-label="Tutup notifikasi"
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Pengumuman kampus"
            className="absolute right-0 z-40 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg"
          >
            <p className="sticky top-0 border-b border-slate-100 bg-white px-4 py-2.5 text-[13px] font-semibold text-slate-900">
              Pengumuman
            </p>
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-500">
                Belum ada pengumuman.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-slate-900">
                        {item.title}
                      </p>
                      {item.id > lastSeen && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-label="Belum dibaca" />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-3 text-xs leading-5 text-slate-600">
                      {item.message}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatAnnouncementTime(item.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
