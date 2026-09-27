"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

function IconOverview() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function IconEvent() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 6.5H14M5.5 1.8V3.5M10.5 1.8V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconReport() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 2.5H9.5L12.5 5.5V13.5H4V2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M9.5 2.5V5.5H12.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M6.5 8.5H10M6.5 11H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6" cy="5.5" r="2.3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.5 13C1.5 10.8 3.3 9.3 6 9.3C8.7 9.3 10.5 10.8 10.5 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="11.5" cy="6" r="1.8" stroke="currentColor" strokeWidth="1.2" />
      <path d="M11.5 9.6C13.4 9.6 14.5 10.8 14.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Ringkasan", href: "/admin", icon: <IconOverview /> },
  { label: "Kurasi Event", href: "/admin/events", icon: <IconEvent /> },
  { label: "Moderasi Laporan", href: "/admin/reports", icon: <IconReport /> },
  { label: "Manajemen User", href: "/admin/users", icon: <IconUsers /> },
];

function AdminNavLink({ item, isActive, onNavigate }: { item: NavItem; isActive: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
        isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className={isActive ? "text-white" : "text-slate-400"}>{item.icon}</span>
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <p className="text-[13px] font-semibold leading-none tracking-tight text-white">UPN Hub</p>
            <p className="mt-0.5 text-[11px] font-medium tracking-wide text-slate-300">Panel Admin</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigasi admin">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Moderasi
          </p>
          <ul className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <AdminNavLink
                  item={item}
                  isActive={item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href) ?? false}
                  onNavigate={() => setMobileOpen(false)}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-4 py-4">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
          >
            <IconBack /> Kembali ke Portal Mahasiswa
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
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
            Mode Admin
          </span>
        </header>

        <main className="mx-auto max-w-[1180px] px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
