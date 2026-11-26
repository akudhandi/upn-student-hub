"use client";

import {
  Fragment,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReportModal from "@/components/ReportModal";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getUser } from "@/lib/auth";
import { initialsOf } from "@/lib/formatters";
import {
  deleteChatMessage,
  fetchConversation,
  fetchConversations,
  markConversationRead,
  sendChatMessage,
  updateChatMessage,
  type ChatMessageItem,
  type ConversationItem,
} from "@/lib/interactions";
import {
  CONTEXT_LABELS,
  contextDetailHref,
  ContextThumbnail,
  dayKeyOf,
  formatClock,
  formatDayLabel,
  isOfficialRecipient,
  recipientRoleLabel,
} from "./_components/chat-helpers";
import {
  ContextSidebar,
  type MessageReportTarget,
} from "./_components/ContextSidebar";
import { ThreadListPane } from "./_components/ThreadListPane";

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
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [myId] = useState<number | null>(() => getUser()?.id ?? null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [reportTarget, setReportTarget] = useState<MessageReportTarget | null>(null);

  const logRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<number | null>(null);
  const loadRequestSeqRef = useRef(0);
  const shouldScrollToBottomRef = useRef(false);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const scrollToBottom = useCallback((behavior?: ScrollBehavior) => {
    const el = logRef.current;
    if (!el) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: prefersReduced ? "auto" : (behavior ?? "smooth"),
    });
    isNearBottomRef.current = true;
  }, []);

  const handleLogScroll = useCallback(() => {
    const el = logRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 96;
    isNearBottomRef.current = nearBottom;
    setShowScrollBottom(!nearBottom && el.scrollHeight > el.clientHeight + 96);
  }, []);

  const loadThreads = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoadingThreads(true);
      setThreadsError(null);
      const data = await fetchConversations(signal);
      if (signal?.aborted) return;
      setThreads(data);
    } catch {
      if (signal?.aborted) return;
      setThreads([]);
      setThreadsError(
        "Gagal memuat daftar percakapan. Periksa koneksi backend lalu coba lagi."
      );
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
        activeIdRef.current = id;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- URL-driven selection must sync state
        setActiveId(id);
        setMobileView("chat");
        shouldScrollToBottomRef.current = true;
        prevMessageCountRef.current = 0;
        isNearBottomRef.current = true;
      }
    }
  }, [requestedId]);

  const loadMessages = useCallback(
    async (id: number, markRead: boolean, signal?: AbortSignal) => {
      const requestSeq = ++loadRequestSeqRef.current;
      const isStale = () =>
        Boolean(signal?.aborted) ||
        activeIdRef.current !== id ||
        requestSeq !== loadRequestSeqRef.current;

      try {
        if (markRead) {
          setIsLoadingMessages(true);
          setMessagesError(null);
        }
        const { conversation: detail, messages: history } = await fetchConversation(id, signal);
        if (isStale()) return;
        setMessages(history);
        setThreads((prev) => {
          const exists = prev.some((t) => t.id === id);
          if (!exists) return [{ ...detail, unread_count: 0 }, ...prev];
          return prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  unread_count: 0,
                  last_message: detail.last_message,
                  context: detail.context ?? t.context,
                  recipient: detail.recipient ?? t.recipient,
                }
              : t
          );
        });
        if (markRead || (detail.unread_count ?? 0) > 0) {
          try {
            await markConversationRead(id);
            if (!isStale()) {
              window.dispatchEvent(new Event("upn-messages-updated"));
            }
          } catch {
            // Non-fatal: unread badge refreshes on next poll.
          }
        }
      } catch {
        if (!isStale() && markRead) {
          setMessages([]);
          setMessagesError(
            "Gagal memuat riwayat pesan. Periksa koneksi backend lalu coba lagi."
          );
        }
      } finally {
        if (!isStale() && markRead) setIsLoadingMessages(false);
      }
    },
    []
  );

  // Open thread: full load + mark read.
  useEffect(() => {
    if (activeId === null) return;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- thread switch must load history
    void loadMessages(activeId, true, controller.signal);
    return () => controller.abort();
  }, [activeId, loadMessages]);

  // Auto-poll active thread every 5s.
  useEffect(() => {
    if (activeId === null) return;
    let pollController: AbortController | null = null;
    const timer = setInterval(() => {
      if (document.hidden) return;
      pollController?.abort();
      pollController = new AbortController();
      void loadMessages(activeId, false, pollController.signal);
    }, 5000);
    return () => {
      pollController?.abort();
      clearInterval(timer);
    };
  }, [activeId, loadMessages]);

  // Periodic thread-list refresh every 15s.
  useEffect(() => {
    let cancelled = false;
    const timer = setInterval(() => {
      if (document.hidden) return;
      void (async () => {
        try {
          const data = await fetchConversations();
          if (cancelled) return;
          const currentActive = activeIdRef.current;
          const nextThreads = data.map((t) =>
            currentActive !== null && t.id === currentActive
              ? { ...t, unread_count: 0 }
              : t
          );
          setThreads(nextThreads);
          const unreadCount = nextThreads.reduce(
            (sum, item) => sum + (item.unread_count || 0),
            0
          );
          window.dispatchEvent(
            new CustomEvent("upn-messages-updated", { detail: { unreadCount } })
          );
        } catch {
          // Non-fatal background refresh.
        }
      })();
    }, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Close open message menu on Escape or outside click.
  useEffect(() => {
    if (openMenuId === null) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuId(null);
    }
    function handlePointerDown(e: PointerEvent) {
      if (
        e.target instanceof Element &&
        !e.target.closest("[data-message-menu]")
      ) {
        setOpenMenuId(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [openMenuId]);

  // Scroll only the message log container when switching threads or receiving new messages near bottom.
  useEffect(() => {
    if (isLoadingMessages) return;
    const hadNewMessage = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (shouldScrollToBottomRef.current) {
      shouldScrollToBottomRef.current = false;
      scrollToBottom("auto");
      return;
    }

    if (hadNewMessage && isNearBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [messages, activeId, isLoadingMessages, scrollToBottom]);

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
    if (id !== activeId) {
      shouldScrollToBottomRef.current = true;
      prevMessageCountRef.current = 0;
      isNearBottomRef.current = true;
      setShowScrollBottom(false);
      setMessagesError(null);
    }
    activeIdRef.current = id;
    setActiveId(id);
    setMobileView("chat");
    setOpenMenuId(null);
    setEditingId(null);
    setActionError(null);
  }

  async function refreshActive(id: number) {
    await loadMessages(id, false);
    try {
      const data = await fetchConversations();
      setThreads(
        data.map((t) => (t.id === id ? { ...t, unread_count: 0 } : t))
      );
    } catch {
      // Non-fatal: thread preview refreshes on next poll.
    }
  }

  function startEdit(message: ChatMessageItem) {
    setEditingId(message.id);
    setEditingDraft(message.body);
    setOpenMenuId(null);
    setActionError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingDraft("");
  }

  async function saveEdit(messageId: number) {
    const text = editingDraft.trim();
    if (!text || activeId === null || isSavingEdit) return;
    setIsSavingEdit(true);
    setActionError(null);
    try {
      const updated = await updateChatMessage(activeId, messageId, text);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
      setEditingId(null);
      setEditingDraft("");
      await refreshActive(activeId);
    } catch {
      setActionError("Gagal mengubah pesan. Coba lagi.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function removeMessage(messageId: number) {
    if (activeId === null || deletingId !== null) return;
    const ok = window.confirm(
      "Hapus pesan ini? Pesan akan tampil sebagai \"Pesan ini telah dihapus\"."
    );
    if (!ok) return;
    setDeletingId(messageId);
    setOpenMenuId(null);
    setActionError(null);
    try {
      const updated = await deleteChatMessage(activeId, messageId);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
      await refreshActive(activeId);
    } catch {
      setActionError("Gagal menghapus pesan. Coba lagi.");
    } finally {
      setDeletingId(null);
    }
  }

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || activeId === null || isSending) return;
    setIsSending(true);
    setActionError(null);
    isNearBottomRef.current = true;
    shouldScrollToBottomRef.current = true;
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
      const nextThreads = data.map((t) =>
        t.id === activeId ? { ...t, unread_count: 0 } : t
      );
      setThreads(nextThreads);
      const unreadCount = nextThreads.reduce(
        (sum, item) => sum + (item.unread_count || 0),
        0
      );
      window.dispatchEvent(
        new CustomEvent("upn-messages-updated", { detail: { unreadCount } })
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft((curr) => (curr === "" ? text : curr));
      setActionError("Gagal mengirim pesan. Periksa koneksi lalu coba lagi.");
    } finally {
      setIsSending(false);
    }
  }

  const unreadTotal = threads.reduce((sum, t) => sum + (t.unread_count || 0), 0);

  return (
    <div className="auth-shell-enter mx-auto max-w-[1200px] space-y-5">
      {/* Calm Header Band (hidden on mobile active chat to preserve viewport height) */}
      <section
        className={`${
          mobileView === "chat" ? "hidden md:flex" : "flex"
        } flex-col justify-between gap-4 border-b border-[#E5E0DA] pb-5 lg:flex-row lg:items-end`}
      >
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-medium text-[#6E6A66]">
            <span>Portal Mahasiswa</span>
            <span aria-hidden="true" className="text-[#CFC8BF]">
              /
            </span>
            <span className="text-[#141416]">Pesan 1-on-1</span>
            <span aria-hidden="true" className="text-[#CFC8BF]">
              ·
            </span>
            <span>
              {isLoadingThreads
                ? "Memuat percakapan…"
                : threadsError
                  ? "Gagal memuat percakapan"
                  : `${threads.length} percakapan${
                      unreadTotal > 0 ? `, ${unreadTotal} belum dibaca` : ""
                    }`}
            </span>
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#141416] sm:text-[30px] sm:leading-[1.18]">
            Kotak pesan.{" "}
            <span className="font-normal text-[#6E6A66]">
              Komunikasi 1-on-1 seputar listing dan transaksi kampus.
            </span>
          </h1>
        </div>
      </section>

      {/* Unified Split Inbox */}
      <div
        className={`grid overflow-hidden rounded-[20px] border border-[#E5E0DA] bg-white grid-cols-1 md:h-[calc(100dvh-248px)] md:min-h-[520px] md:max-h-[760px] md:grid-cols-[270px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_272px] ${
          mobileView === "chat"
            ? "h-[calc(100dvh-130px)] min-h-[440px]"
            : "min-h-[460px]"
        }`}
      >
        {/* ---------- COLUMN 1: Inbox list ---------- */}
        <ThreadListPane
          mobileView={mobileView}
          threads={threads}
          filtered={filtered}
          activeId={activeId}
          filter={filter}
          query={query}
          unreadTotal={unreadTotal}
          isLoadingThreads={isLoadingThreads}
          threadsError={threadsError}
          onQueryChange={setQuery}
          onFilterChange={setFilter}
          onResetFilters={() => {
            setFilter("Semua");
            setQuery("");
          }}
          onReloadThreads={() => void loadThreads()}
          onOpenChat={openChat}
        />

        {/* ---------- COLUMN 2: Chat area ---------- */}
        {active === null ? (
          <section
            aria-label="Belum ada percakapan aktif"
            className={`${
              mobileView === "chat" ? "flex" : "hidden md:flex"
            } min-h-0 min-w-0 flex-col items-center justify-center bg-[#FAF8F6] px-6 py-12 text-center`}
          >
            {isLoadingThreads && requestedId ? (
              <div role="status" aria-busy="true" className="space-y-3">
                <p className="font-display text-[16px] font-semibold text-[#141416]">
                  Membuka percakapan…
                </p>
                <p className="text-[14px] text-[#6E6A66]">
                  Mengambil riwayat pesan dari server.
                </p>
                <button
                  type="button"
                  onClick={() => setMobileView("list")}
                  className="mt-2 inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] md:hidden"
                >
                  Kembali ke daftar pesan
                </button>
              </div>
            ) : threads.length === 0 ? (
              <>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E0DA] bg-white text-[#57534E]"
                  aria-hidden="true"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v8a2.5 2.5 0 01-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 014 13.5v-8z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2 className="mt-4 font-display text-[18px] font-semibold text-[#141416]">
                  Kotak pesan masih kosong
                </h2>
                <p className="mt-1.5 max-w-[360px] text-[14px] leading-relaxed text-[#6E6A66]">
                  Percakapan 1-on-1 dimulai dari tombol chat di halaman detail barang marketplace, jasa mahasiswa, atau laporan barang hilang.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/marketplace"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-colors hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                  >
                    Buka marketplace
                  </Link>
                  <Link
                    href="/services"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-6 text-[14px] font-medium text-[#141416] transition-colors hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                  >
                    Lihat jasa mahasiswa
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E0DA] bg-white text-[#57534E]"
                  aria-hidden="true"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v8a2.5 2.5 0 01-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 014 13.5v-8z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2 className="mt-4 font-display text-[18px] font-semibold text-[#141416]">
                  {requestedId && mobileView === "chat"
                    ? "Percakapan tidak ditemukan"
                    : "Pilih percakapan untuk memulai"}
                </h2>
                <p className="mt-1.5 max-w-[340px] text-[14px] leading-relaxed text-[#6E6A66]">
                  {requestedId && mobileView === "chat"
                    ? "Obrolan yang diminta tidak tersedia atau Anda bukan pesertanya."
                    : "Pilih salah satu obrolan di daftar sebelah kiri untuk membaca dan membalas pesan."}
                </p>
                <button
                  type="button"
                  onClick={() => setMobileView("list")}
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-colors hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] md:hidden"
                >
                  Kembali ke daftar pesan
                </button>
              </>
            )}
          </section>
        ) : (
          <section
            aria-label={`Percakapan dengan ${active.recipient?.name?.trim() || "pengguna"}`}
            className={`${
              mobileView === "list" ? "hidden" : "flex"
            } min-h-0 min-w-0 flex-col bg-white md:flex`}
          >
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-[#E5E0DA] bg-white px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => {
                  setMobileView("list");
                  setOpenMenuId(null);
                }}
                aria-label="Kembali ke daftar pesan"
                className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-full border border-[#E5E0DA] bg-[#F6F4F1] pl-3 pr-3.5 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#CFC8BF] hover:bg-[#EFECE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] md:hidden"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M10 3L5 8L10 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Kembali</span>
              </button>

              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#141416] text-[13px] font-semibold text-white"
                aria-hidden="true"
              >
                {initialsOf(active.recipient?.name?.trim() || "UP")}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-display text-[15px] font-semibold text-[#141416]">
                  <span className="truncate">
                    {active.recipient?.name?.trim() || "Pengguna UPN"}
                  </span>
                  {isOfficialRecipient(active.recipient) && (
                    <VerifiedBadge
                      size="xs"
                      title={`${recipientRoleLabel(active.recipient)} terverifikasi`}
                    />
                  )}
                </p>
                <p className="truncate text-[13px] text-[#6E6A66]">
                  {recipientRoleLabel(active.recipient)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {active.recipient?.id && active.recipient.id !== myId && (
                  <button
                    type="button"
                    onClick={() =>
                      setReportTarget({
                        type: "user",
                        id: active.recipient!.id,
                        title: active.recipient?.name?.trim() || "Pengguna UPN",
                      })
                    }
                    className="inline-flex min-h-[38px] items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-3 text-[12px] font-medium text-[#57534E] transition-colors hover:border-[#B83232]/40 hover:text-[#B83232] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B83232]"
                  >
                    Laporkan pengguna
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setReportTarget({
                      type: "chat",
                      id: active.id,
                      title: `Percakapan dengan ${active.recipient?.name?.trim() || "Pengguna UPN"}`,
                    })
                  }
                  className="inline-flex min-h-[38px] items-center justify-center rounded-full border border-[#E5E0DA] bg-white px-3 text-[12px] font-medium text-[#57534E] transition-colors hover:border-[#B83232]/40 hover:text-[#B83232] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B83232]"
                >
                  Laporkan chat
                </button>
              </div>
            </div>

            {/* Listing context strip */}
            {active.context?.title && (
              <div className="flex items-center gap-3 border-b border-[#E5E0DA] bg-[#F6F4F1] px-4 py-2.5 sm:px-5">
                <ContextThumbnail context={active.context} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-[#6E6A66]">
                    {active.context.type && CONTEXT_LABELS[active.context.type]
                      ? `Membahas ${CONTEXT_LABELS[active.context.type]}`
                      : "Membahas listing"}
                  </p>
                  <p className="truncate text-[14px] font-semibold text-[#141416]">
                    {active.context.title}
                  </p>
                </div>
                {contextDetailHref(active.context) && (
                  <Link
                    href={contextDetailHref(active.context) as string}
                    className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-4 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                  >
                    Lihat detail
                  </Link>
                )}
              </div>
            )}

            {/* Messages log */}
            <div
              ref={logRef}
              onScroll={handleLogScroll}
              className="relative flex-1 space-y-4 overflow-y-auto bg-white px-4 py-5 sm:px-5"
              role="log"
              aria-label="Riwayat pesan"
              aria-live="polite"
            >
              {isLoadingMessages ? (
                <div
                  role="status"
                  aria-busy="true"
                  aria-label="Memuat pesan"
                  className="space-y-3"
                >
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`flex ${i % 2 ? "justify-end" : ""}`}>
                      <div
                        className={`h-12 w-2/3 max-w-[340px] animate-pulse rounded-[18px] ${
                          i % 2 ? "bg-[#EFECE8]" : "bg-[#F4F1EE]"
                        }`}
                      />
                    </div>
                  ))}
                  <span className="sr-only">Memuat pesan…</span>
                </div>
              ) : messagesError ? (
                <div role="alert" className="mx-auto max-w-sm py-10 text-center">
                  <div className="rounded-2xl border border-[#E8C5C5] bg-[#FDF2F2] p-4">
                    <p className="text-[14px] font-medium text-[#B83232]">
                      {messagesError}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadMessages(active.id, true)}
                    className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                  >
                    Muat ulang pesan
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="mx-auto max-w-sm py-12 text-center">
                  <p className="font-display text-[16px] font-semibold text-[#141416]">
                    Belum ada pesan di obrolan ini
                  </p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-[#6E6A66]">
                    Kirim pesan pertama untuk menanyakan ketersediaan atau detail transaksi.
                  </p>
                </div>
              ) : (
                messages.map((m, index) => {
                  const self =
                    m.sender_id === -1 ||
                    (myId !== null
                      ? m.sender_id === myId
                      : active.recipient !== null &&
                        m.sender_id !== active.recipient.id);
                  const showDay =
                    index === 0 ||
                    dayKeyOf(m.created_at) !==
                      dayKeyOf(messages[index - 1].created_at);
                  const deleted = Boolean(m.is_deleted);
                  const edited = Boolean(m.is_edited) && !deleted;
                  const isEditing = editingId === m.id;
                  const canManage =
                    self && !deleted && !isEditing && m.sender_id !== -1;
                  const editedLabel = edited ? " · telah diedit" : "";
                  const openDownward = index === 0;

                  return (
                    <Fragment key={`${m.id}-${index}`}>
                      {showDay && (
                        <div className="flex justify-center py-1">
                          <span className="rounded-md border border-[#E5E0DA] bg-[#F4F1EE] px-3 py-1 text-[13px] font-medium text-[#57534E]">
                            {formatDayLabel(m.created_at)}
                          </span>
                        </div>
                      )}

                      {self ? (
                        <div className="flex justify-end">
                          <div className="min-w-0 max-w-[85%] sm:max-w-[75%]">
                            {deleted ? (
                              <div className="rounded-[18px] rounded-br-md border border-dashed border-[#D9D2C9] bg-[#F6F4F1] px-4 py-2.5 text-[14px] leading-relaxed text-[#57534E]">
                                <p className="flex items-center gap-1.5 italic">
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    aria-hidden="true"
                                    className="shrink-0"
                                  >
                                    <path
                                      d="M2.5 4H4M4 4H12M4 4V3C4 2.4 4.4 2 5 2H7C7.6 2 8 2.4 8 3V4M4 4L5 13.5C5 13.8 5.2 14 5.5 14H10.5C10.8 14 11 13.8 11 13.5L12 4"
                                      stroke="currentColor"
                                      strokeWidth="1.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  Pesan ini telah dihapus
                                </p>
                              </div>
                            ) : isEditing ? (
                              <div className="rounded-[18px] rounded-br-md bg-[#141416] p-3.5 text-white">
                                <label
                                  htmlFor={`edit-chat-${m.id}`}
                                  className="sr-only"
                                >
                                  Ubah pesan
                                </label>
                                <input
                                  id={`edit-chat-${m.id}`}
                                  value={editingDraft}
                                  onChange={(e) => setEditingDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") void saveEdit(m.id);
                                    if (e.key === "Escape") cancelEdit();
                                  }}
                                  autoFocus
                                  maxLength={2000}
                                  className="h-11 w-full rounded-xl border border-white/25 bg-white/10 px-3 text-[14px] text-white placeholder:text-[#D6D3CE] focus:border-white focus:outline-none"
                                />
                                <div className="mt-2.5 flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    disabled={isSavingEdit}
                                    className="inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-[13px] font-medium text-[#E5E0DA] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
                                  >
                                    Batal
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void saveEdit(m.id)}
                                    disabled={isSavingEdit || editingDraft.trim() === ""}
                                    className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-4 text-[13px] font-semibold text-[#141416] transition-colors hover:bg-[#F4F1EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
                                  >
                                    {isSavingEdit ? "Menyimpan…" : "Simpan"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-[18px] rounded-br-md bg-[#141416] px-4 py-2.5 text-[14px] leading-relaxed text-white [overflow-wrap:anywhere]">
                                <p className="whitespace-pre-wrap">{m.body}</p>
                              </div>
                            )}

                            <div className="mt-1 flex items-center justify-end gap-1">
                              <p className="text-[13px] text-[#6E6A66]">
                                {formatClock(m.created_at)}
                                {editedLabel}
                              </p>
                              {canManage && (
                                <span className="relative" data-message-menu>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenMenuId(openMenuId === m.id ? null : m.id)
                                    }
                                    aria-label="Opsi pesan"
                                    aria-expanded={openMenuId === m.id}
                                    aria-haspopup="menu"
                                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-[#6E6A66] transition-colors hover:bg-[#F4F1EE] hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 12 12"
                                      fill="currentColor"
                                      aria-hidden="true"
                                    >
                                      <circle cx="6" cy="2" r="1.2" />
                                      <circle cx="6" cy="6" r="1.2" />
                                      <circle cx="6" cy="10" r="1.2" />
                                    </svg>
                                  </button>
                                  {openMenuId === m.id && (
                                    <span
                                      role="menu"
                                      className={`absolute right-0 z-10 w-36 overflow-hidden rounded-xl border border-[#E5E0DA] bg-white p-1.5 shadow-[0_12px_28px_-12px_rgba(20,20,22,0.16)] ${
                                        openDownward ? "top-12" : "bottom-12"
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => startEdit(m)}
                                        className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-[13px] font-medium text-[#141416] transition-colors hover:bg-[#F4F1EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                                      >
                                        Edit pesan
                                      </button>
                                      <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => void removeMessage(m.id)}
                                        disabled={deletingId === m.id}
                                        className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-[13px] font-medium text-[#B83232] transition-colors hover:bg-[#FDF2F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] disabled:opacity-50"
                                      >
                                        {deletingId === m.id ? "Menghapus…" : "Hapus pesan"}
                                      </button>
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-end gap-2.5">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E5E0DA] bg-[#F4F1EE] text-[13px] font-semibold text-[#141416]"
                            aria-hidden="true"
                          >
                            {initialsOf(active.recipient?.name?.trim() || "UP")}
                          </span>
                          <div className="min-w-0 max-w-[85%] sm:max-w-[75%]">
                            {deleted ? (
                              <div className="rounded-[18px] rounded-bl-md border border-dashed border-[#D9D2C9] bg-[#FAF8F6] px-4 py-2.5 text-[14px] leading-relaxed text-[#57534E]">
                                <p className="flex items-center gap-1.5 italic">
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    aria-hidden="true"
                                    className="shrink-0"
                                  >
                                    <path
                                      d="M2.5 4H4M4 4H12M4 4V3C4 2.4 4.4 2 5 2H7C7.6 2 8 2.4 8 3V4M4 4L5 13.5C5 13.8 5.2 14 5.5 14H10.5C10.8 14 11 13.8 11 13.5L12 4"
                                      stroke="currentColor"
                                      strokeWidth="1.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  Pesan ini telah dihapus
                                </p>
                              </div>
                            ) : (
                              <div className="rounded-[18px] rounded-bl-md border border-[#E5E0DA] bg-[#F4F1EE] px-4 py-2.5 text-[14px] leading-relaxed text-[#141416] [overflow-wrap:anywhere]">
                                <p className="whitespace-pre-wrap">{m.body}</p>
                              </div>
                            )}
                            <p className="mt-1 text-[13px] text-[#6E6A66]">
                              {formatClock(m.created_at)}
                              {editedLabel}
                            </p>
                          </div>
                        </div>
                      )}
                    </Fragment>
                  );
                })
              )}

              {showScrollBottom && (
                <div className="pointer-events-none sticky bottom-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowScrollBottom(false);
                      scrollToBottom("smooth");
                    }}
                    aria-label="Gulir ke pesan terbaru"
                    className="pointer-events-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#D9D2C9] bg-white px-4 text-[13px] font-medium text-[#141416] shadow-[0_8px_20px_-8px_rgba(20,20,22,0.18)] transition-colors hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M8 3v10M4 9l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Pesan terbaru</span>
                  </button>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-[#E5E0DA] bg-white px-4 py-3 sm:px-5">
              {actionError && (
                <p
                  role="alert"
                  className="mb-2.5 rounded-xl border border-[#E8C5C5] bg-[#FDF2F2] px-3.5 py-2.5 text-[13px] font-medium text-[#B83232]"
                >
                  {actionError}
                </p>
              )}
              <form onSubmit={sendMessage} className="flex items-center gap-2.5">
                <label htmlFor="chat-input" className="sr-only">
                  Ketik pesan
                </label>
                <input
                  id="chat-input"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Tulis pesan untuk lawan bicara..."
                  autoComplete="off"
                  maxLength={2000}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] px-4 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-colors hover:border-[#CFC8BF] focus:border-[#141416] focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSending || draft.trim() === ""}
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#141416] px-6 text-[14px] font-medium text-white transition-colors duration-150 ease-[cubic-bezier(.2,.8,.2,1)] hover:bg-[#242428] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] focus-visible:ring-offset-2 disabled:opacity-45"
                >
                  {isSending ? "Mengirim…" : "Kirim"}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* ---------- COLUMN 3: Context / profile (Desktop XL) ---------- */}
        <ContextSidebar
          active={active}
          myId={myId}
          onReport={(target) => setReportTarget(target)}
        />
      </div>

      <ReportModal
        open={reportTarget !== null}
        title={reportTarget?.title ?? ""}
        type={reportTarget?.type ?? "chat"}
        id={reportTarget?.id ?? 0}
        onClose={() => setReportTarget(null)}
      />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1200px] py-12 text-center text-[14px] text-[#6E6A66]">
          Memuat pesan…
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
