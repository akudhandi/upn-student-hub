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
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
        isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white transition-opacity ${
          isActive ? "opacity-100" : "opacity-0"
        }`}
      />
      <span className={isActive ? "text-white" : "text-slate-400"}>{item.icon}</span>
      <span className="flex-1">{item.label}</span>
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
    <div className="min-h-screen bg-[#F4F5F7]">
      {mobileOpen && (
        <button
          aria-label="Tutup navigasi admin"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#0A2342] transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-[64px] items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-[#0A2342]">
            U
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-none tracking-tight text-white">UPN Student Hub</p>
            <p className="mt-0.5 text-[11px] font-medium tracking-wide text-slate-300">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigasi admin">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-5 last:mb-0">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <AdminNavLink item={item} isActive={isActive(item.href)} onNavigate={() => setMobileOpen(false)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
          >
            {ICONS.back} Kembali ke Portal Mahasiswa
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-[64px] items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
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
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h1 className="truncate text-sm font-semibold text-slate-900">Administrasi Platform</h1>
            <span className="hidden shrink-0 items-center rounded-full bg-[#0A2342] px-2.5 py-0.5 text-[11px] font-semibold text-white sm:inline-flex">
              BAAK • Kemahasiswaan
            </span>
          </div>
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 md:inline-flex">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0A2342] text-[9px] font-bold text-white">
              A
            </span>
            Administrator
          </span>
          <Link
            href="/"
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A2342] focus-visible:ring-offset-2"
          >
            Lihat Portal →
          </Link>
        </header>

        <main className="mx-auto max-w-[1180px] px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
