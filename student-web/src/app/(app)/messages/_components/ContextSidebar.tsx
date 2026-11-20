"use client";

import Link from "next/link";
import VerifiedBadge from "@/components/VerifiedBadge";
import { initialsOf } from "@/lib/formatters";
import type { ConversationItem } from "@/lib/interactions";
import {
  CONTEXT_LABELS,
  contextDetailHref,
  ContextThumbnail,
  isOfficialRecipient,
  recipientRoleLabel,
} from "./chat-helpers";

export function ContextSidebar({ active }: { active: ConversationItem | null }) {
  return (
    <aside
      aria-label="Detail kontak"
      className="hidden min-h-0 flex-col gap-5 overflow-y-auto border-l border-[#E5E0DA] bg-white p-5 xl:flex"
    >
      {active ? (
        <>
          <div className="flex flex-col items-center rounded-2xl border border-[#E5E0DA] bg-[#F6F4F1] p-5 text-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#141416] text-[15px] font-semibold text-white"
              aria-hidden="true"
            >
              {initialsOf(active.recipient?.name?.trim() || "UP")}
            </span>
            <h2 className="mt-3 flex max-w-full items-center justify-center gap-1.5 font-display text-[16px] font-semibold text-[#141416]">
              <span className="truncate">
                {active.recipient?.name?.trim() || "Pengguna UPN"}
              </span>
              {isOfficialRecipient(active.recipient) && (
                <VerifiedBadge
                  size="xs"
                  title={`${recipientRoleLabel(active.recipient)} terverifikasi`}
                />
              )}
            </h2>
            <p className="mt-1 text-[13px] text-[#57534E]">
              {recipientRoleLabel(active.recipient)}
            </p>
          </div>

          {active.context?.title && (
            <div className="rounded-2xl border border-[#E5E0DA] bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[13px] font-semibold text-[#141416]">
                  Konteks listing
                </h3>
                {active.context.type && CONTEXT_LABELS[active.context.type] && (
                  <span className="rounded-md bg-[#F4F1EE] px-2.5 py-0.5 text-[13px] font-medium text-[#57534E]">
                    {CONTEXT_LABELS[active.context.type]}
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-start gap-3">
                <ContextThumbnail context={active.context} />
                <p className="line-clamp-2 flex-1 text-[14px] font-medium leading-snug text-[#141416]">
                  {active.context.title}
                </p>
              </div>
              {contextDetailHref(active.context) && (
                <Link
                  href={contextDetailHref(active.context) as string}
                  className="mt-3.5 inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-[#D9D2C9] bg-white px-4 text-[13px] font-medium text-[#141416] transition-colors hover:border-[#141416] hover:bg-[#FAF8F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
                >
                  Lihat detail listing
                </Link>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-[#E5E0DA] bg-[#F6F4F1] p-4">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-[#141416]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="shrink-0 text-[#141416]"
              >
                <path
                  d="M8 1.5L14 4V8C14 11.5 11.5 14 8 14.8C4.5 14 2 11.5 2 8V4L8 1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 8L7.4 9.4L10 6.6"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Tips transaksi aman</span>
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#57534E]">
              Jangan bagikan kode OTP atau data rekening pribadi. Untuk transaksi COD, temui lawan bicara di area kampus yang ramai.
            </p>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
          <p className="text-[14px] font-medium text-[#57534E]">
            Detail lawan bicara dan konteks listing akan muncul di sini setelah Anda memilih percakapan.
          </p>
        </div>
      )}
    </aside>
  );
}
