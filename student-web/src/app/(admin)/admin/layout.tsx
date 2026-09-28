"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-5 w-5 shrink-0">
      {children}
    </svg>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <Svg>
      <rect x="1.5" y="1.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" fill="currentColor" />
    </Svg>
  ),
  marketplace: (
    <Svg>
      <path d="M2 5.5L8 2L14 5.5V13H2V5.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M6 13V7H10V13" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </Svg>
  ),
  services: (
    <Svg>
      <path d="M8 3.5L2.5 6L8 8.5L13.5 6L8 3.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M2.5 8L8 10.5L13.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M2.5 10L8 12.5L13.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </Svg>
  ),
  kost: (
    <Svg>
      <path d="M2 7L8 2L14 7V13H10V9.5H6V13H2V7Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </Svg>
  ),
  lostfound: (
    <Svg>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.5 7H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="11" cy="11" r="2.3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12.6 12.6L14 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  ),
  event: (
    <Svg>
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 6.5H14M5.5 1.8V3.5M10.5 1.8V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  ),
  users: (
    <Svg>
      <circle cx="6" cy="5.5" r="2.3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 13C1.5 10.8 3.3 9.3 6 9.3C8.7 9.3 10.5 10.8 10.5 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="11.5" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
      <path d="M11.5 9.6C13.4 9.6 14.5 10.8 14.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  ),
  reports: (
    <Svg>
      <path d="M4 2.5H9.5L12.5 5.5V13.5H4V2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M9.5 2.5V5.5H12.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M6.5 8.5H10M6.5 11H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  ),
  categories: (
    <Svg>
      <path d="M2.5 4.5H6L7 6H13.5V12.5H2.5V4.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </Svg>
  ),
  notifications: (
    <Svg>
      <path d="M8 2.5C5.7 2.5 4 4 4 6V10L3 11.5H13L12 10V6C12 4 10.3 2.5 8 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M6.5 13C6.5 13.8 7.1 14.5 8 14.5C8.9 14.5 9.5 13.8 9.5 13H6.5Z" stroke="currentColor" strokeWidth="1.2" />
    </Svg>
  ),
  settings: (
    <Svg>
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 1.8V3.5M8 12.5V14.2M1.8 8H3.5M12.5 8H14.2M3.6 3.6L4.8 4.8M11.2 11.2L12.4 12.4M12.4 3.6L11.2 4.8M4.8 11.2L3.6 12.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </Svg>
  ),
  back: (
    <Svg>
      <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
};

function nav(href: string, label: string, icon: string): NavItem {
  return { href, label, icon: ICONS[icon] };
}

const NAV_SECTIONS: NavSection[] = [
  { title: "Utama", items: [nav("/admin/dashboard", "Dashboard", "dashboard")] },
  {
    title: "Konten",
    items: [
      nav("/admin/marketplace", "Marketplace", "marketplace"),
      nav("/admin/services", "Jasa Mahasiswa", "services"),
      nav("/admin/kost", "Kost", "kost"),
      nav("/admin/lost-found", "Lost & Found", "lostfound"),
      nav("/admin/events", "Event & Informasi", "event"),
    ],
  },
  {
    title: "Komunitas",
    items: [
      nav("/admin/users", "Users", "users"),
      nav("/admin/reports", "Reports / Moderasi", "reports"),
    ],
  },
  {
    title: "Sistem",
    items: [
      nav("/admin/categories", "Categories", "categories"),
      nav("/admin/notifications", "Notifications", "notifications"),
      nav("/admin/settings", "Settings", "settings"),
    ],
  },
];

function AdminNavLink({ item, isActive, onNavigate }: { item: NavItem; isActive: boolean; onNavigate: () => void }) {
  if (isActive) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current="page"
        className="flex items-center gap-3 rounded-lg border-l-4 border-sky-400 bg-gradient-to-r from-[#173054] to-[#173054]/80 px-3 py-2.5 font-medium text-white shadow-sm"
      >
        <span className="text-sky-400">{item.icon}</span>
        <span className="text-sm">{item.label}</span>
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 transition hover:bg-[#132845] hover:text-white"
    >
      <span className="text-slate-400">{item.icon}</span>
      <span className="text-sm">{item.label}</span>
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string): boolean {
    if (href === "/admin/dashboard") {
      return pathname === "/admin" || pathname === "/admin/dashboard";
    }
    return pathname === href || pathname?.startsWith(`${href}/`) === true;
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-800 antialiased">
      {mobileOpen && (
        <button
          aria-label="Tutup navigasi admin"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* LeftSidebar (design HTML: navy sidebar, fixed) */}
      <aside
        data-purpose="main-sidebar"
        className={`sidebar-scroll fixed inset-y-0 left-0 z-30 flex w-64 flex-shrink-0 select-none flex-col border-r border-slate-800/80 bg-[#0b192e] text-slate-300 transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top Brand Logo */}
        <div className="flex h-20 items-center gap-3.5 border-b border-slate-800/60 bg-[#08172c]/60 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-lg font-extrabold text-white shadow-md shadow-sky-500/20 ring-1 ring-white/20">
            U
          </div>
          <div className="leading-tight">
            <h1 className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight text-white">
              UPN Student Hub
            </h1>
            <p className="text-xs font-medium tracking-wide text-slate-400">Admin Portal</p>
          </div>
        </div>

        {/* Navigation Scrollable Area */}
        <nav className="sidebar-scroll flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Navigasi admin">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              <div className="mt-2 space-y-1">
                {section.items.map((item) => (
                  <AdminNavLink
                    key={item.href}
                    item={item}
                    isActive={isActive(item.href)}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800/60 px-4 py-4">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            {ICONS.back} Kembali ke Portal Mahasiswa
          </Link>
        </div>
      </aside>

      {/* Main column */}
      <div className="min-w-0 flex-1 lg:pl-64">
        {/* Top navigation header (design HTML: h-20 white sticky) */}
        <header
          data-purpose="top-navigation-header"
          className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/90 bg-white px-4 shadow-xs sm:px-8"
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
              aria-label="Buka navigasi admin"
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span className="block h-3.5 w-3.5">
                <span className="block h-0.5 w-full bg-current" />
                <span className="mt-1 block h-0.5 w-full bg-current" />
                <span className="mt-1 block h-0.5 w-full bg-current" />
              </span>
            </button>
            <span className="truncate text-base font-bold tracking-tight text-slate-800">
              Administrasi Platform
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-4">
            <button
              type="button"
              aria-label="Cari data"
              className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 sm:block"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20L16.5 16.5" />
              </svg>
            </button>
            <Link
              href="/admin/notifications"
              aria-label="Pemberitahuan"
              className="relative hidden rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 sm:block"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 01-3.4 0" />
              </svg>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
            </Link>
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <div className="hidden cursor-pointer items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50/70 px-3 py-1.5 transition hover:bg-slate-100/60 md:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                A
              </div>
              <span className="pr-1 text-sm font-semibold text-slate-700">Administrator</span>
            </div>
            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-2xs transition hover:border-slate-400 hover:bg-white"
            >
              <span>Lihat Portal</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-slate-500">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
