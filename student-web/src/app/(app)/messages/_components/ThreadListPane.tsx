"use client";

import Link from "next/link";
import VerifiedBadge from "@/components/VerifiedBadge";
import { initialsOf } from "@/lib/formatters";
import type { ConversationItem } from "@/lib/interactions";
import {
  CONTEXT_LABELS,
  formatThreadTime,
  isOfficialRecipient,
  recipientRoleLabel,
  ThreadSkeleton,
} from "./chat-helpers";

export function ThreadListPane({
  mobileView,
  threads,
  filtered,
  activeId,
  filter,
  query,
  unreadTotal,
  isLoadingThreads,
  threadsError,
  onQueryChange,
  onFilterChange,
  onResetFilters,
  onReloadThreads,
  onOpenChat,
}: {
  mobileView: "list" | "chat";
  threads: ConversationItem[];
  filtered: ConversationItem[];
  activeId: number | null;
  filter: "Semua" | "Belum Dibaca";
  query: string;
  unreadTotal: number;
  isLoadingThreads: boolean;
  threadsError: string | null;
  onQueryChange: (value: string) => void;
  onFilterChange: (filter: "Semua" | "Belum Dibaca") => void;
  onResetFilters: () => void;
  onReloadThreads: () => void;
  onOpenChat: (id: number) => void;
}) {
  return (
    <section
      aria-label="Daftar percakapan"
      className={`${
        mobileView === "chat" ? "hidden" : "flex"
      } min-h-0 min-w-0 flex-col border-[#E5E0DA] bg-white md:flex md:border-r`}
    >
      <div className="border-b border-[#E5E0DA] p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-[17px] font-semibold tracking-tight text-[#141416]">
            Percakapan
          </h2>
          <span className="rounded-md bg-[#F4F1EE] px-2.5 py-1 text-[13px] font-medium text-[#57534E]">
            {threads.length} obrolan
          </span>
        </div>

        <div className="relative mt-3">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#66625E]">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path
                d="M10.5 10.5L13 13"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <label htmlFor="search-chat" className="sr-only">
            Cari obrolan
          </label>
          <input
            id="search-chat"
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Cari nama, pesan, atau listing..."
            className={`h-11 w-full rounded-xl border border-[#E5E0DA] bg-[#F6F4F1] pl-10 text-[14px] text-[#141416] placeholder:text-[#66625E] transition-colors hover:border-[#CFC8BF] focus:border-[#141416] focus:bg-white focus:outline-none ${
              query ? "pr-11" : "pr-3.5"
            }`}
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Hapus pencarian"
              className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#57534E] transition-colors hover:text-[#141416] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 4l8 8M12 4l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter percakapan">
          {(["Semua", "Belum Dibaca"] as const).map((f) => {
            const isActive = filter === f;
            const label = f === "Belum Dibaca" ? `Belum Dibaca (${unreadTotal})` : f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => onFilterChange(f)}
                aria-pressed={isActive}
                className={`min-h-[44px] rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                  isActive
                    ? "bg-[#141416] text-white"
                    : "bg-[#F4F1EE] text-[#57534E] hover:bg-[#EAE6E2] hover:text-[#141416]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoadingThreads ? (
        <div
          role="status"
          aria-busy="true"
          aria-label="Memuat percakapan"
          className="flex-1 divide-y divide-[#F1EDE8] overflow-hidden"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <ThreadSkeleton key={i} />
          ))}
          <span className="sr-only">Memuat percakapan…</span>
        </div>
      ) : threadsError ? (
        <div role="alert" className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
          <div className="w-full rounded-2xl border border-[#E8C5C5] bg-[#FDF2F2] p-4">
            <p className="font-display text-[15px] font-semibold text-[#B83232]">
              Gagal memuat percakapan
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#B83232]">
              {threadsError}
            </p>
          </div>
          <button
            type="button"
            onClick={onReloadThreads}
            className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
          >
            Muat ulang percakapan
          </button>
        </div>
      ) : threads.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 text-center">
          <h3 className="font-display text-[16px] font-semibold text-[#141416]">
            Belum ada percakapan
          </h3>
          <p className="mt-1.5 max-w-[260px] text-[14px] leading-relaxed text-[#6E6A66]">
            Mulai chat 1-on-1 langsung dari halaman detail barang, jasa, atau barang hilang.
          </p>
          <Link
            href="/marketplace"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#141416] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#242428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] md:hidden"
          >
            Jelajahi marketplace
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 text-center">
          <h3 className="font-display text-[16px] font-semibold text-[#141416]">
            Tidak ada obrolan yang cocok
          </h3>
          <p className="mt-1.5 max-w-[260px] text-[14px] leading-relaxed text-[#6E6A66]">
            {filter === "Belum Dibaca" && query.trim() === ""
              ? "Semua pesan sudah dibaca. Tampilkan seluruh percakapan untuk melihat riwayat."
              : "Coba ubah kata kunci pencarian atau tampilkan semua obrolan."}
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-5 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
          >
            Tampilkan semua obrolan
          </button>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-[#F1EDE8] overflow-y-auto" role="list">
          {filtered.map((t) => {
            const name = t.recipient?.name?.trim() || "Pengguna UPN";
            const official = isOfficialRecipient(t.recipient);
            const isActive = t.id === activeId;
            const contextLabel = t.context?.type
              ? CONTEXT_LABELS[t.context.type] ?? null
              : null;
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onOpenChat(t.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex min-h-[76px] w-full items-start gap-3 border-l-[3px] px-4 py-3.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#141416] ${
                    isActive
                      ? "border-l-[#141416] bg-[#EFECE8]"
                      : "border-l-transparent bg-white hover:bg-[#FAF8F6]"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
                      isActive
                        ? "bg-[#141416] text-white"
                        : "border border-[#E5E0DA] bg-[#F4F1EE] text-[#141416]"
                    }`}
                    aria-hidden="true"
                  >
                    {initialsOf(name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[14px] font-semibold text-[#141416]">
                          {name}
                        </span>
                        {official && (
                          <VerifiedBadge
                            size="xs"
                            title={`${recipientRoleLabel(t.recipient)} terverifikasi`}
                          />
                        )}
                      </span>
                      <span
                        className={`shrink-0 text-[13px] ${
                          isActive ? "text-[#5F5B57]" : "text-[#6E6A66]"
                        }`}
                      >
                        {formatThreadTime(t.last_message?.created_at ?? t.updated_at)}
                      </span>
                    </span>

                    {t.context?.title && (
                      <span
                        className={`mt-0.5 block truncate text-[13px] font-medium ${
                          isActive ? "text-[#141416]" : "text-[#57534E]"
                        }`}
                      >
                        {contextLabel ? `${contextLabel}: ${t.context.title}` : t.context.title}
                      </span>
                    )}

                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-[13px] ${
                          t.unread_count > 0
                            ? "font-semibold text-[#141416]"
                            : isActive
                              ? "text-[#57534E]"
                              : "text-[#6E6A66]"
                        }`}
                      >
                        {t.last_message?.body ?? "Belum ada pesan"}
                      </span>
                      {t.unread_count > 0 && (
                        <span
                          className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#141416] px-2 text-[13px] font-semibold text-white"
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
        </ul>
      )}
    </section>
  );
}
