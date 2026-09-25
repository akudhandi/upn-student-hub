"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getUser } from "@/lib/auth";
import {
  fetchConversation,
  fetchConversations,
  markConversationRead,
  sendChatMessage,
  type ChatContext,
  type ChatMessageItem,
  type ConversationItem,
  type InteractableType,
} from "@/lib/interactions";

const AVATAR_TONES = [
  "bg-amber-100 text-amber-800",
  "bg-emerald-100 text-emerald-800",
  "bg-teal-100 text-teal-800",
  "bg-indigo-100 text-indigo-700",
  "bg-rose-100 text-rose-800",
];

const CONTEXT_COLORS: Record<string, string> = {
  marketplace: "text-amber-600",
  kost: "text-emerald-600",
  service: "text-teal-600",
  lostfound: "text-indigo-600",
  event: "text-sky-600",
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function toneOf(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function formatClock(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");
}

function formatThreadTime(isoDate: string | null): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return formatClock(isoDate);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Kemarin";
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function contextDetailHref(context: ChatContext | null): string | null {
  if (!context?.type || !context?.id) return null;
  switch (context.type as InteractableType) {
    case "marketplace":
      return `/marketplace/${context.id}`;
    case "kost":
      return `/kost/${context.id}`;
    case "service":
      return `/services/${context.id}`;
    case "lostfound":
      return `/lost-found/${context.id}`;
    case "event":
      return `/events/${context.id}`;
    default:
      return null;
  }
}

function ThreadSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-100" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("conversation_id");

  const [threads, setThreads] = useState<ConversationItem[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"Semua" | "Belum Dibaca">("Semua");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [myId] = useState<number | null>(() => getUser()?.id ?? null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoadingThreads(true);
      setThreadsError(null);
      const data = await fetchConversations();
      if (signal?.aborted) return;
      setThreads(data);
    } catch {
      if (signal?.aborted) return;
      setThreads([]);
      setThreadsError("Gagal memuat percakapan. Periksa koneksi ke backend lalu coba lagi.");
    } finally {
      if (signal?.aborted) return;
      setIsLoadingThreads(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch must populate state on mount
    void loadThreads(controller.signal);
    return () => controller.abort();
  }, [loadThreads]);

  // Deep-link (?conversation_id=) from detail-page CTAs.
  useEffect(() => {
    if (requestedId) {
      const id = Number(requestedId);
      if (!Number.isNaN(id)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- URL-driven selection must sync state
        setActiveId(id);
        setMobileView("chat");
      }
    }
  }, [requestedId]);

  const loadMessages = useCallback(async (id: number, markRead: boolean, signal?: AbortSignal) => {
    try {
      if (markRead) setIsLoadingMessages(true);
      const { conversation: detail, messages: history } = await fetchConversation(id);
      if (signal?.aborted) return;
      setMessages(history);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, unread_count: 0, last_message: detail.last_message } : t
        )
      );
      if (markRead) {
        try {
          await markConversationRead(id);
        } catch {
          // Non-fatal: unread badge refreshes on next poll.
        }
      }
    } catch {
      if (!signal?.aborted && markRead) setMessages([]);
    } finally {
      if (!signal?.aborted && markRead) setIsLoadingMessages(false);
    }
  }, []);

  // Open thread: full load + mark read.
  useEffect(() => {
    if (activeId === null) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- thread switch must load history
    void loadMessages(activeId, true, controller.signal);
    return () => controller.abort();
  }, [activeId, loadMessages]);

  // Auto-poll active thread every 5s for smooth dev experience.
  useEffect(() => {
    if (activeId === null) return;
    const timer = setInterval(() => {
      void loadMessages(activeId, false);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeId, loadMessages]);

  // Periodic thread-list refresh every 15s.
  useEffect(() => {
    const timer = setInterval(() => {
      const controller = new AbortController();
      void (async () => {
        try {
          const data = await fetchConversations();
          if (!controller.signal.aborted) setThreads(data);
        } catch {
          // Non-fatal background refresh.
        }
      })();
      return () => controller.abort();
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, activeId]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  const filtered = useMemo(() => {
    return threads.filter((t) => {
      if (filter === "Belum Dibaca" && !(t.unread_count > 0)) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        (t.recipient?.name ?? "").toLowerCase().includes(q) ||
        (t.last_message?.body ?? "").toLowerCase().includes(q) ||
        (t.context?.title ?? "").toLowerCase().includes(q)
      );
    });
  }, [threads, filter, query]);

  function openChat(id: number) {
    setActiveId(id);
    setMobileView("chat");
  }

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || activeId === null || isSending) return;
    setIsSending(true);
    const optimistic: ChatMessageItem = {
      id: Date.now(),
      body: text,
      sender_id: -1,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    try {
      await sendChatMessage(activeId, text);
      await loadMessages(activeId, false);
      const data = await fetchConversations();
      setThreads(data);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setIsSending(false);
    }
  }

  const unreadTotal = threads.reduce((sum, t) => sum + (t.unread_count || 0), 0);

  return (
    <div className="-mx-4 -my-6 lg:-mx-6">
      <div className="grid h-[calc(100vh-64px)] grid-cols-1 bg-white lg:grid-cols-[300px_1fr_280px]">
        {/* ---------- COLUMN 1: Inbox list ---------- */}
        <section
          aria-label="Daftar percakapan"
          className={`${
            mobileView === "chat" ? "hidden" : "flex"
          } flex-col border-r border-slate-200 lg:flex`}
        >
          <div className="border-b border-slate-200 px-4 pb-3 pt-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">Pesan Masuk</h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                {threads.length} Percakapan
              </span>
            </div>
            <div className="relative mt-3">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </span>
              <label htmlFor="search-chat" className="sr-only">
                Cari obrolan
              </label>
              <input
                id="search-chat"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari obrolan..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter percakapan">
              {(["Semua", "Belum Dibaca"] as const).map((f) => {
                const isActive = filter === f;
                const label = f === "Belum Dibaca" ? `Belum Dibaca (${unreadTotal})` : f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    aria-pressed={isActive}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2 ${
                      isActive
                        ? "bg-[#002147] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {isLoadingThreads ? (
            <div role="status" aria-busy="true" aria-label="Memuat percakapan" className="flex-1 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <ThreadSkeleton key={i} />
              ))}
              <span className="sr-only">Memuat percakapan…</span>
            </div>
          ) : threadsError ? (
            <div role="alert" className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-900">Gagal memuat percakapan</p>
              <p className="mt-1 text-xs text-slate-500">{threadsError}</p>
              <button
                type="button"
                onClick={() => void loadThreads()}
                className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Coba lagi
              </button>
            </div>
          ) : (
            <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto" role="list">
              {filtered.map((t) => {
                const name = t.recipient?.name ?? "Pengguna UPN";
                const isActive = t.id === activeId;
                const contextColor = t.context?.type ? (CONTEXT_COLORS[t.context.type] ?? "text-slate-500") : "text-slate-500";
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => openChat(t.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#002147] ${
                        isActive ? "border-l-[3px] border-[#002147] bg-slate-100/70" : "border-l-[3px] border-transparent"
                      }`}
                    >
                      <span className="relative shrink-0">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${toneOf(name)}`}
                          aria-hidden="true"
                        >
                          {initialsOf(name)}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900">{name}</span>
                          <span className="shrink-0 text-[11px] text-slate-400">
                            {formatThreadTime(t.last_message?.created_at ?? t.updated_at)}
                          </span>
                        </span>
                        {t.context?.title && (
                          <span className={`mt-0.5 block truncate text-xs font-medium ${contextColor}`}>
                            {t.context.title}
                          </span>
                        )}
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-slate-500">
                            {t.last_message?.body ?? "Belum ada pesan"}
                          </span>
                          {t.unread_count > 0 && (
                            <span
                              className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#002147] px-1 text-[10px] font-bold text-white"
                              aria-label={`${t.unread_count} pesan belum dibaca`}
                            >
                              {t.unread_count}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-slate-900">Tidak ada percakapan</p>
                  <p className="mt-1 text-xs text-slate-500">Coba ubah kata kunci atau filter.</p>
                </li>
              )}
            </ul>
          )}
        </section>

        {/* ---------- COLUMN 2: Chat area ---------- */}
        {active === null ? (
          <section
            aria-label="Belum ada percakapan aktif"
            className="hidden min-h-0 flex-col items-center justify-center bg-[#F8F9FB] px-6 text-center lg:flex"
          >
            <p className="text-sm font-semibold text-slate-900">Pilih percakapan untuk memulai chat</p>
            <p className="mt-1 max-w-[320px] text-xs leading-5 text-slate-500">
              Pilih salah satu thread di daftar, atau mulai chat baru dari halaman detail listing.
            </p>
          </section>
        ) : (
          <section
            aria-label={`Percakapan dengan ${active.recipient?.name ?? "pengguna"}`}
            className={`${
              mobileView === "list" ? "hidden" : "flex"
            } min-h-0 flex-col bg-[#F8F9FB] lg:flex`}
          >
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setMobileView("list")}
                aria-label="Kembali ke daftar pesan"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="relative shrink-0">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${toneOf(active.recipient?.name ?? "?")}`}
                  aria-hidden="true"
                >
                  {initialsOf(active.recipient?.name ?? "?")}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {active.recipient?.name ?? "Pengguna UPN"}
                </p>
                <p className="truncate text-xs text-slate-500">Mahasiswa UPN</p>
              </div>
            </div>

            {/* Context banner */}
            {active.context?.title && (
              <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
                <span className="flex h-11 w-9 shrink-0 items-center justify-center rounded border border-slate-200 bg-[#EEF2F7] text-slate-400" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 4.5C5 4 5.4 3.5 6 3.5H15L19 7.5V19.5C19 20 18.6 20.5 18 20.5H6C5.4 20.5 5 20 5 19.5V4.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    <path d="M15 3.5V7.5H19" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-slate-500">
                    Menanyakan listing: <span className="font-medium text-slate-700">{active.context.title}</span>
                  </p>
                </div>
                {contextDetailHref(active.context) && (
                  <Link
                    href={contextDetailHref(active.context) as string}
                    className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
                  >
                    Lihat Iklan
                  </Link>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" role="log" aria-label="Riwayat pesan" aria-live="polite">
              {isLoadingMessages ? (
                <div role="status" aria-busy="true" aria-label="Memuat pesan" className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`flex ${i % 2 ? "justify-end" : ""}`}>
                      <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-slate-200/70" />
                    </div>
                  ))}
                  <span className="sr-only">Memuat pesan…</span>
                </div>
              ) : messages.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-500">
                  Belum ada pesan. Sapa dulu untuk memulai percakapan.
                </p>
              ) : (
                messages.map((m) => {
                  // Own messages: optimistic (-1) or matching logged-in user id.
                  // Fallback when logged out: anything not from the recipient.
                  const self =
                    m.sender_id === -1 ||
                    (myId !== null
                      ? m.sender_id === myId
                      : active.recipient !== null && m.sender_id !== active.recipient.id);
                  return self ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[75%]">
                        <div className="rounded-2xl rounded-br-md bg-[#002147] px-3.5 py-2.5 text-sm leading-6 text-white">
                          <p>{m.body}</p>
                        </div>
                        <p className="mt-1 text-right text-[11px] text-slate-400">{formatClock(m.created_at)}</p>
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="flex items-end gap-2">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${toneOf(active.recipient?.name ?? "?")}`}
                        aria-hidden="true"
                      >
                        {initialsOf(active.recipient?.name ?? "?")}
                      </span>
                      <div className="max-w-[75%]">
                        <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-6 text-slate-800 shadow-sm">
                          <p>{m.body}</p>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">{formatClock(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 bg-white px-4 pb-3 pt-2.5">
              <form onSubmit={sendMessage} className="flex items-center gap-2">
                <label htmlFor="chat-input" className="sr-only">
                  Ketik pesan
                </label>
                <input
                  id="chat-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ketik pesan..."
                  autoComplete="off"
                  className="h-10 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#002147] focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSending || draft.trim() === ""}
                  className="h-10 shrink-0 rounded-lg bg-[#002147] px-4 text-sm font-semibold text-white hover:bg-[#0a2f5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  {isSending ? "…" : "Kirim"}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* ---------- COLUMN 3: Context / profile ---------- */}
        <aside
          aria-label="Detail kontak"
          className="hidden min-h-0 flex-col overflow-y-auto border-l border-slate-200 bg-white px-5 py-5 lg:flex"
        >
          {active ? (
            <>
              <div className="flex flex-col items-center text-center">
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full text-base font-bold ${toneOf(active.recipient?.name ?? "?")}`}
                  aria-hidden="true"
                >
                  {initialsOf(active.recipient?.name ?? "?")}
                </span>
                <h2 className="mt-3 text-base font-bold text-slate-900">{active.recipient?.name ?? "Pengguna UPN"}</h2>
                <p className="mt-0.5 text-xs text-slate-500">Mahasiswa UPN</p>
              </div>

              {active.context?.title && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Konteks Listing
                  </h3>
                  <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-5 text-slate-900">
                    {active.context.title}
                  </p>
                  {contextDetailHref(active.context) && (
                    <Link
                      href={contextDetailHref(active.context) as string}
                      className="mt-2 inline-block rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Lihat Iklan
                    </Link>
                  )}
                </div>
              )}

              <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-emerald-600">
                    <path d="M8 1.5L14 4V8C14 11.5 11.5 14 8 14.8C4.5 14 2 11.5 2 8V4L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                    <path d="M6 8L7.4 9.4L10 6.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Tips Chat Aman
                </p>
                <p className="mt-1.5 text-[11px] leading-5 text-slate-600">
                  Jangan bagikan OTP atau data bank. Transaksi COD sebaiknya di area kampus yang ramai.
                </p>
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-xs text-slate-500">Pilih percakapan untuk melihat detail.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Memuat pesan…</p>}>
      <MessagesContent />
    </Suspense>
  );
}
