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
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E0DA] bg-white text-[#57534E] transition-all duration-200 hover:-translate-y-[1px] hover:border-[#D5CEC6] hover:text-[#141416] hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
      >
        <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 2.5C5.7 2.5 4 4 4 6V10L3 11.5H13L12 10V6C12 4 10.3 2.5 8 2.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
          <path d="M6.5 13C6.5 13.8 7.1 14.5 8 14.5C8.9 14.5 9.5 13.8 9.5 13H6.5Z" stroke="currentColor" strokeWidth="1.25" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#D97706] ring-2 ring-white" aria-hidden="true" />
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
            className="auth-dropdown-enter absolute right-0 z-40 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-[#E5E0DA] bg-white shadow-[0_18px_40px_-16px_rgba(20,20,22,0.18)]"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-[#F1EDE9] bg-white/95 px-4 py-3 backdrop-blur-sm">
              <p className="font-display text-[13px] font-semibold text-[#141416]">
                Pengumuman Kampus
              </p>
              {items.length > 0 && (
                <span className="rounded-full bg-[#F4F1EE] px-2 py-0.5 text-[10px] font-medium text-[#6E6A66]">
                  {items.length} info
                </span>
              )}
            </div>
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-[#787470]">
                Belum ada pengumuman terbaru.
              </p>
            ) : (
              <ul className="divide-y divide-[#F3EFEA]">
                {items.map((item) => (
                  <li key={item.id} className="px-4 py-3 transition-colors hover:bg-[#FAF8F6]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-[#141416]">
                        {item.title}
                      </p>
                      {item.id > lastSeen && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D97706]" aria-label="Belum dibaca" />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-3 text-xs leading-5 text-[#6E6A66]">
                      {item.message}
                    </p>
                    <p className="mt-1.5 text-[11px] text-[#9A958F]">
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
