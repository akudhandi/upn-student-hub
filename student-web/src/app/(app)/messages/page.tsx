"use client";

import { useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Placeholder data — static arrays for UI preview only.
// TODO: Replace with real API (e.g. GET /api/v1/chat/rooms) when backend
// chat is connected. Keep the same shape so the swap is trivial.
// ---------------------------------------------------------------------------

type Conversation = {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  time: string;
  context: string;
  contextColor: string;
  snippet: string;
  unread?: number;
  online?: boolean;
  category: "marketplace" | "kost" | "jasa" | "lostfound";
};

const CONVERSATIONS: Conversation[] = [
  {
    id: "jessica",
    name: "Jessica Lee",
    initials: "JL",
    avatarBg: "bg-amber-100 text-amber-800",
    time: "14:08",
    context: "Buku Kalkulus Stewart Edisi 9",
    contextColor: "text-amber-600",
    snippet: "Bisa kak, jam 15.30 saya bawa ke lobi perpustaka...",
    online: true,
    category: "marketplace",
  },
  {
    id: "dimas",
    name: "Dimas Pratama",
    initials: "DP",
    avatarBg: "bg-emerald-100 text-emerald-800",
    time: "11:22",
    context: "Kost Putri Griya Sakura",
    contextColor: "text-emerald-600",
    snippet: "Kamar mandi dalamnya masih ada yang koson...",
    unread: 1,
    online: true,
    category: "kost",
  },
  {
    id: "sarah",
    name: "Sarah Maharani",
    initials: "SM",
    avatarBg: "bg-teal-100 text-teal-800",
    time: "Kemarin",
    context: "Jasa Desain PPT Skripsi",
    contextColor: "text-teal-600",
    snippet: "File revisi format PPTX sudah saya email ya kak!",
    online: true,
    category: "jasa",
  },
  {
    id: "fikri",
    name: "Fikri Ramadhan",
    initials: "FR",
    avatarBg: "bg-indigo-100 text-indigo-700",
    time: "24 Okt",
    context: "Kalkulator Casio fx-991EX",
    contextColor: "text-orange-500",
    snippet: "Terima kasih banyak kak, barangnya sangat mulus!",
    category: "marketplace",
  },
  {
    id: "putri",
    name: "Putri Ayu",
    initials: "PA",
    avatarBg: "bg-rose-100 text-rose-800",
    time: "21 Okt",
    context: "KTM Tertinggal di Kantin",
    contextColor: "text-indigo-600",
    snippet: "KTM kamu udah dititipin ke satpam FISIP ya.",
    unread: 1,
    category: "lostfound",
  },
];

type ChatMessage = {
  id: string;
  from: "me" | "partner";
  text: string;
  time: string;
  withImages?: boolean;
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    from: "partner",
    text: "Halo Alex! Iya, buku Kalkulus Stewart edisi ke-9 masih ada. Kondisinya masih bersih banget, gak ada coretan pulpen atau stabilo di bab 1 sampai 10.",
    time: "13:54",
  },
  {
    id: "m2",
    from: "me",
    text: "Mantap kak! Pas banget buat mata kuliah Kalkulus Lanjut semester ini. Kalau boleh Rp 420.000 pas COD hari ini gimana kak?",
    time: "14:02",
  },
  {
    id: "m3",
    from: "partner",
    text: "Boleh kak, deal Rp 420.000 ya. Ini foto fisik bukunya sekarang:",
    time: "14:05",
    withImages: true,
  },
  {
    id: "m4",
    from: "partner",
    text: "Bisa kak, jam 15.30 saya bawa ke lobi perpustakaan ya. Saya pakai jaket krem.",
    time: "14:08",
  },
];

const QUICK_REPLIES = ["Oke siap, jam 15.30 di lobi perpus ya", "Bisa nego lagi kak?"];

const USER_DETAIL = {
  name: "Jessica Lee",
  meta: "Mahasiswa Arsitektur (2022)",
  initials: "JL",
  rating: "4.9 (28 ulasan)",
  fakultas: "Arsitektur & Desain",
  status: "Aktif (Semester 7)",
  transaksi: "34 transaksi",
};

const FILTERS = ["Semua", "Belum Dibaca", "Marketplace"] as const;
type Filter = (typeof FILTERS)[number];

export default function MessagesPage() {
  const [activeId, setActiveId] = useState("jessica");
  const [filter, setFilter] = useState<Filter>("Semua");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [detailOpen, setDetailOpen] = useState(false);

  const active = CONVERSATIONS.find((c) => c.id === activeId) ?? CONVERSATIONS[0];

  const filtered = useMemo(() => {
    return CONVERSATIONS.filter((c) => {
      if (filter === "Belum Dibaca" && !c.unread) return false;
      if (filter === "Marketplace" && c.category !== "marketplace") return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.context.toLowerCase().includes(q) ||
          c.snippet.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filter, query]);

  function openChat(id: string) {
    setActiveId(id);
    setMobileView("chat");
  }

  function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `m-${Date.now()}`, from: "me", text, time: "Sekarang" },
    ]);
    setDraft("");
  }

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
                5 Percakapan
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
              {FILTERS.map((f) => {
                const isActive = filter === f;
                const label = f === "Belum Dibaca" ? "Belum Dibaca (2)" : f;
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

          <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto" role="list">
            {filtered.map((c) => {
              const isActive = c.id === activeId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openChat(c.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#002147] ${
                      isActive ? "border-l-[3px] border-[#002147] bg-slate-100/70" : "border-l-[3px] border-transparent"
                    }`}
                  >
                    <span className="relative shrink-0">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${c.avatarBg}`}
                        aria-hidden="true"
                      >
                        {c.initials}
                      </span>
                      {c.online && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">{c.name}</span>
                        <span className="shrink-0 text-[11px] text-slate-400">{c.time}</span>
                      </span>
                      <span className={`mt-0.5 block truncate text-xs font-medium ${c.contextColor}`}>
                        {c.context}
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-slate-500">{c.snippet}</span>
                        {c.unread && (
                          <span
                            className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#002147] px-1 text-[10px] font-bold text-white"
                            aria-label={`${c.unread} pesan belum dibaca`}
                          >
                            {c.unread}
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
        </section>

        {/* ---------- COLUMN 2: Chat area ---------- */}
        <section
          aria-label={`Percakapan dengan ${active.name}`}
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
                className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${active.avatarBg}`}
                aria-hidden="true"
              >
                {active.initials}
              </span>
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500"
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {active.name} <span className="mx-1 font-normal text-slate-300">•</span>{" "}
                <span className="font-normal text-slate-500">Arsitektur &apos;22</span>
              </p>
              <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                Online
              </p>
            </div>
            <button
              type="button"
              aria-label="Telepon"
              className="hidden h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-50 hover:text-slate-600 sm:inline-flex"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3 2.5C3 2.2 3.2 2 3.5 2H5.2C5.4 2 5.6 2.2 5.6 2.4L6.2 5C6.2 5.2 6.1 5.4 5.9 5.5L4.9 6.2C5.4 7.5 6.5 8.6 7.8 9.1L8.5 8.1C8.6 7.9 8.8 7.8 9 7.8L11.6 8.4C11.8 8.4 12 8.6 12 8.8V10.5C12 10.8 11.8 11 11.5 11C7.4 11 3 6.6 3 2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setDetailOpen(true)}
              aria-label="Lihat detail kontak"
              className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-50 hover:text-slate-600 lg:hidden"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8 7.2V11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="8" cy="5.2" r="0.7" fill="currentColor" />
              </svg>
            </button>
            <span className="hidden h-8 w-8 items-center justify-center rounded text-slate-400 lg:inline-flex" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8 7.2V11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="8" cy="5.2" r="0.7" fill="currentColor" />
              </svg>
            </span>
          </div>

          {/* Context banner */}
          <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
            <span className="flex h-11 w-9 shrink-0 items-center justify-center rounded border border-slate-200 bg-[#EEF2F7] text-slate-400" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 4.5C5 4 5.4 3.5 6 3.5H15L19 7.5V19.5C19 20 18.6 20.5 18 20.5H6C5.4 20.5 5 20 5 19.5V4.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M15 3.5V7.5H19" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-slate-500">
                Menanyakan listing: <span className="font-medium text-slate-700">Buku Kalkulus Stewart Edisi 9</span>
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
                <s className="text-xs text-slate-400">Rp 450.000</s>
                <span className="font-bold text-slate-900">Rp 420.000 (Sepakat)</span>
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
            >
              Lihat Iklan
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" role="log" aria-label="Riwayat pesan" aria-live="polite">
            <div className="flex justify-center">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500">
                Hari ini
              </span>
            </div>

            {messages.map((m) =>
              m.from === "partner" ? (
                <div key={m.id} className="flex items-end gap-2">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${active.avatarBg}`}
                    aria-hidden="true"
                  >
                    {active.initials}
                  </span>
                  <div className="max-w-[75%]">
                    <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-6 text-slate-800 shadow-sm">
                      <p>{m.text}</p>
                      {m.withImages && (
                        <span className="mt-2 grid grid-cols-2 gap-2" aria-label="Foto buku dari penjual">
                          <span className="flex aspect-[3/4] items-center justify-center rounded-lg bg-[#E8EDF3] text-slate-400">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.3" />
                              <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" />
                              <path d="M3 16L8.5 11L13 15.5L16 13L21 18" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
                            </svg>
                          </span>
                          <span className="flex aspect-[3/4] items-center justify-center rounded-lg bg-[#E8EDF3] text-slate-400">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.3" />
                              <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" />
                              <path d="M3 16L8.5 11L13 15.5L16 13L21 18" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
                            </svg>
                          </span>
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{m.time}</p>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[75%]">
                    <div className="rounded-2xl rounded-br-md bg-[#002147] px-3.5 py-2.5 text-sm leading-6 text-white">
                      <p>{m.text}</p>
                    </div>
                    <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-slate-400">
                      {m.time}
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-label="Sudah dibaca" className="text-blue-600">
                        <path d="M2.5 8.5L6 12L10 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M7 12L10.5 8.5L14 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
                      </svg>
                    </p>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Quick replies + input */}
          <div className="border-t border-slate-200 bg-white px-4 pb-3 pt-2.5">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              <span className="shrink-0 text-xs text-slate-400">Balas cepat:</span>
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setDraft(q)}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-[#002147] hover:text-[#002147] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
                >
                  {q}
                </button>
              ))}
            </div>
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Lampirkan file"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              >
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M8 11.5V3.8C8 2.8 7.2 2 6.2 2C5.2 2 4.5 2.8 4.5 3.8V10.5C4.5 12.4 6 14 8 14C10 14 11.5 12.4 11.5 10.5V5.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
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
                className="h-10 shrink-0 rounded-lg bg-[#002147] px-4 text-sm font-semibold text-white hover:bg-[#0a2f5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
              >
                Kirim
              </button>
            </form>
          </div>
        </section>

        {/* ---------- COLUMN 3: Context / profile ---------- */}
        <aside
          aria-label="Detail kontak"
          className="hidden min-h-0 flex-col overflow-y-auto border-l border-slate-200 bg-white px-5 py-5 lg:flex"
        >
          <div className="flex flex-col items-center text-center">
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-full text-base font-bold ${active.avatarBg}`}
              aria-hidden="true"
            >
              {active.initials}
            </span>
            <h2 className="mt-3 text-base font-bold text-slate-900">{USER_DETAIL.name}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{USER_DETAIL.meta}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 1.8L9.9 5.6L14.1 6.2L11 9.2L11.7 13.4L8 11.4L4.3 13.4L5 9.2L1.9 6.2L6.1 5.6L8 1.8Z"
                  stroke="currentColor"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                />
              </svg>
              {USER_DETAIL.rating}
            </span>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Informasi Mahasiswa
            </h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs text-slate-500">Fakultas</dt>
                <dd className="text-right text-xs font-medium text-slate-900">{USER_DETAIL.fakultas}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs text-slate-500">Status</dt>
                <dd className="text-right text-xs font-semibold text-emerald-600">{USER_DETAIL.status}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs text-slate-500">Transaksi Selesai</dt>
                <dd className="text-right text-xs font-medium text-slate-900">{USER_DETAIL.transaksi}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Lokasi COD Pilihan
            </h3>
            <ul className="mt-3 space-y-2.5">
              <li className="flex gap-2.5 rounded-lg border border-slate-200 p-3">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-slate-400">
                  <path d="M8 14C8 14 3.5 9.3 3.5 6C3.5 3.5 5.5 1.5 8 1.5C10.5 1.5 12.5 3.5 12.5 6C12.5 9.3 8 14 8 14Z" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="8" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <span>
                  <span className="block text-xs font-semibold text-slate-900">Gedung Perpustakaan Pusat</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                    Area Lobi Utama / Meja Informasi Lantai 1
                  </span>
                </span>
              </li>
              <li className="flex gap-2.5 rounded-lg border border-slate-200 p-3">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-slate-400">
                  <path d="M2.5 6.5V12.5H13.5V6.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M2 6.5L3 3.5H13L14 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M6 12.5V9.5H10V12.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                <span>
                  <span className="block text-xs font-semibold text-slate-900">Kantin GSG</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                    Bisa jam istirahat siang (12.00 - 13.00)
                  </span>
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-emerald-600">
                <path d="M8 1.5L14 4V8C14 11.5 11.5 14 8 14.8C4.5 14 2 11.5 2 8V4L8 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M6 8L7.4 9.4L10 6.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Tips COD Aman
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-600">
              Selalu cek kelengkapan barang sebelum membayar. Disarankan bertemu di area kampus yang
              ramai.
            </p>
          </div>
        </aside>
      </div>

      {/* Mobile detail drawer */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Detail kontak">
          <button
            type="button"
            aria-label="Tutup detail kontak"
            onClick={() => setDetailOpen(false)}
            className="absolute inset-0 bg-slate-900/40"
          />
          <div className="absolute inset-x-4 top-16 max-h-[75vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${active.avatarBg}`}
                  aria-hidden="true"
                >
                  {active.initials}
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{USER_DETAIL.name}</h2>
                  <p className="text-xs text-slate-500">{USER_DETAIL.meta}</p>
                  <p className="mt-1 text-xs font-semibold text-amber-700">{USER_DETAIL.rating}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                aria-label="Tutup"
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-600"
              >
                ✕
              </button>
            </div>
            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-xs text-slate-500">Fakultas</dt>
                <dd className="text-xs font-medium text-slate-900">{USER_DETAIL.fakultas}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-xs text-slate-500">Status</dt>
                <dd className="text-xs font-semibold text-emerald-600">{USER_DETAIL.status}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-xs text-slate-500">Transaksi Selesai</dt>
                <dd className="text-xs font-medium text-slate-900">{USER_DETAIL.transaksi}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-semibold text-slate-900">Tips COD Aman</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-600">
                Selalu cek kelengkapan barang sebelum membayar. Disarankan bertemu di area kampus
                yang ramai.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
