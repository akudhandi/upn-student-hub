"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser, type AuthUser } from "@/lib/auth";

type ModuleCard = {
  title: string;
  description: string;
  href: string;
};

const MODULES: ModuleCard[] = [
  {
    title: "Marketplace",
    description: "Buy & sell textbooks, electronics, and supplies.",
    href: "/marketplace",
  },
  {
    title: "Services",
    description: "Tutoring, design, tech repair by peers.",
    href: "/services",
  },
  {
    title: "Kost",
    description: "Find off-campus housing and roommates.",
    href: "/kost",
  },
  {
    title: "Lost & Found",
    description: "Report or locate missing items on campus.",
    href: "/lost-found",
  },
];

function ModuleIcon({ title }: { title: string }) {
  const base = "flex h-8 w-8 items-center justify-center rounded border";
  const styles: Record<string, { wrapper: string; icon: string }> = {
    Marketplace: {
      wrapper: "bg-[#FFF7ED] border-orange-200",
      icon: "text-[#C2410C]",
    },
    Services: {
      wrapper: "bg-[#ECFDF5] border-emerald-200",
      icon: "text-[#047857]",
    },
    Kost: {
      wrapper: "bg-[#EFF6FF] border-blue-200",
      icon: "text-[#1D4ED8]",
    },
    "Lost & Found": {
      wrapper: "bg-[#F5F3FF] border-violet-200",
      icon: "text-[#6D28D9]",
    },
  };
  const style = styles[title] ?? { wrapper: "bg-slate-50 border-slate-200", icon: "text-slate-600" };

  let icon: React.ReactNode;
  if (title === "Marketplace") {
    icon = (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 5.5L8 2L14 5.5V13H2V5.5Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
        <path d="M6 13V7H10V13" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      </svg>
    );
  } else if (title === "Services") {
    icon = (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 3.5L2.5 6L8 8.5L13.5 6L8 3.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M2.5 8L8 10.5L13.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M2.5 10L8 12.5L13.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  } else if (title === "Kost") {
    icon = (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 7L8 2L14 7V13H10V9.5H6V13H2V7Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  } else {
    icon = (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5.5 7H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="11" cy="11" r="2.2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M12.5 12.5L14 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  return <span className={`${base} ${style.wrapper} ${style.icon}`}>{icon}</span>;
}

function EmptyActivityIllustration() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-400">
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.15" />
        <path d="M4 6.5H12" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
        <path d="M4 9H9" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function EmptyMessagesIllustration() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-400">
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.15" />
        <path d="M2.5 4L8 8.2L13.5 4" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate user from localStorage on mount
    setUser(getUser());
  }, []);

  const displayName =
    (user?.profile && typeof user.profile === "object" && "name" in user.profile
      ? (user.profile as { name?: string }).name
      : null) || user?.name || null;
  const firstName = displayName ? displayName.split(" ")[0] : null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 18) return "Good Afternoon";
    return "Good Evening";
  })();

  const studentMeta = (() => {
    if (!user) return null;
    const faculty =
      user.profile && typeof user.profile === "object" && "faculty" in user.profile
        ? (user.profile as { faculty?: string | null }).faculty
        : null;
    const nim =
      user.profile && typeof user.profile === "object" && "nim" in user.profile
        ? (user.profile as { nim?: string | null }).nim
        : null;
    const parts: string[] = [];
    if (nim) parts.push(`ID: ${nim}`);
    if (faculty) parts.push(faculty);
    if (parts.length === 0 && user.email) parts.push(user.email);
    return parts.join("  ·  ");
  })();

  return (
    <div className="mx-auto max-w-[1080px] space-y-5 sm:space-y-6">
      {/* Greeting */}
      <section className="border-b border-slate-200/60 pb-5 sm:pb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 sm:text-[26px]">
          {firstName ? `${greeting}, ${firstName}.` : `${greeting}.`}
        </h1>
        {studentMeta ? (
          <p className="mt-1 text-xs font-medium tracking-wide text-slate-500">
            {studentMeta} <span className="mx-1.5 text-slate-300">·</span> Academic Portal
          </p>
        ) : (
          <p className="mt-1 max-w-[560px] text-sm leading-5 text-slate-500">Your campus activity at a glance — marketplace, housing, and community updates.</p>
        )}
        <p className="mt-1.5 max-w-[560px] text-xs leading-5 text-slate-500 sm:text-[13px]">Browse modules below. Your recent activity and messages will appear once backend modules are connected.</p>
      </section>

      {/* Quick access / module cards */}
      <section aria-labelledby="quick-access-heading">
        <h2 id="quick-access-heading" className="sr-only">
          Quick access
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {MODULES.map((m) => (
            <Link
              key={m.title}
              href={m.href}
              className="group flex flex-col rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2"
            >
              <ModuleIcon title={m.title} />
              <h3 className="mt-3 text-[13px] font-semibold text-slate-900">{m.title}</h3>
              <p className="mt-1 flex-1 text-xs leading-5 text-slate-500">{m.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#002147] group-hover:underline">
                Open
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-slate-400 group-hover:text-[#002147]">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Main grid */}
      <section className="grid gap-5 lg:grid-cols-[1.7fr_0.9fr] lg:gap-6">
        {/* Recent Community Activity */}
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5">
            <h2 className="text-[13px] font-semibold text-slate-900">Recent Community Activity</h2>
            <Link
              href="/marketplace"
              className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2 rounded-sm px-1"
            >
              View all
            </Link>
          </div>

          {/* Empty state — no fake listings */}
          <div className="flex flex-col items-center px-6 py-10 text-center sm:py-12">
            <EmptyActivityIllustration />
            <h3 className="mt-4 text-sm font-semibold text-slate-900">No community activity yet</h3>
            <p className="mt-1.5 max-w-[360px] text-xs leading-5 text-slate-500">
              New listings from Marketplace, Kost, and Lost &amp; Found will appear here once modules are connected to the API.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Link
                href="/marketplace"
                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Browse Marketplace
              </Link>
              <Link
                href="/kost"
                className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Find Kost
              </Link>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-[#F8F9FB] px-4 py-2.5 sm:px-5">
            <p className="text-[11px] leading-4 text-slate-500">
              Placeholder state — this feed is ready for real data. No mock transactions are displayed as real activity.
            </p>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5 sm:space-y-6">
          {/* Recent Messages */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5">
              <h2 className="text-[13px] font-semibold text-slate-900">Recent Messages</h2>
              <Link
                href="/messages"
                aria-label="Open messages"
                className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-50 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            <div className="flex flex-col items-center px-6 py-8 text-center">
              <EmptyMessagesIllustration />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">No messages yet</h3>
              <p className="mt-1 max-w-[260px] text-xs leading-5 text-slate-500">Your 1-on-1 conversations will appear here when chat is available.</p>
              <Link
                href="/messages"
                className="mt-4 text-xs font-medium text-[#002147] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] rounded-sm"
              >
                Go to Messages
              </Link>
            </div>

            <div className="border-t border-slate-100 bg-[#F8F9FB] px-4 py-2.5 sm:px-5">
              <p className="text-[11px] leading-4 text-slate-500">Placeholder — messages will appear when chat is implemented.</p>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3.5 sm:px-5">
              <h2 className="text-[13px] font-semibold text-slate-900">Quick Shortcuts</h2>
            </div>
            <div className="space-y-2 p-3">
              <Link
                href="/marketplace"
                className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-50 border border-slate-200 text-slate-600">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="3" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.1" />
                    <path d="M5 7H11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                    <path d="M5 9.5H9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                  </svg>
                </span>
                Exam Schedule
                <span className="ml-auto text-slate-400" aria-hidden="true">
                  ›
                </span>
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-50 border border-slate-200 text-slate-600">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="3" y="3" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.1" />
                    <circle cx="8" cy="7" r="2" stroke="currentColor" strokeWidth="1.1" />
                    <path d="M5 12C5 10.3 6.3 9 8 9C9.7 9 11 10.3 11 12" stroke="currentColor" strokeWidth="1.1" />
                  </svg>
                </span>
                Digital ID
                <span className="ml-auto text-slate-400" aria-hidden="true">
                  ›
                </span>
              </Link>
              <div
                className="flex w-full items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-400"
                aria-disabled="true"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white border border-slate-200 text-slate-400">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="4" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.1" />
                    <path d="M8 4V12" stroke="currentColor" strokeWidth="1.1" />
                    <path d="M4 8H12" stroke="currentColor" strokeWidth="1.1" />
                  </svg>
                </span>
                Campus Map
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide border border-slate-200 bg-white px-1.5 py-0.5 rounded">Soon</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
