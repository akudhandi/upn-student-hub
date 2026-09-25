"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getToken, clearAuth, getUser, type AuthUser } from "@/lib/auth";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
};

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" fill="currentColor" />
    </svg>
  );
}
function IconMarketplace() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 5.5L8 2L14 5.5V13H2V5.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M6 13V7H10V13" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
function IconServices() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3.5L2.5 6L8 8.5L13.5 6L8 3.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M2.5 8L8 10.5L13.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M2.5 10L8 12.5L13.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
function IconKost() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 7L8 2L14 7V13H10V9.5H6V13H2V7Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
function IconLostFound() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.5 7H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5.5 10H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="11" cy="11" r="2.3" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12.6 12.6L14 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function IconEvent() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 6.5H14M5.5 1.8V3.5M10.5 1.8V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5.5 9.5L7 11L10.5 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconMessages() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 3.5H13.5C13.78 3.5 14 3.72 14 4V10C14 10.28 13.78 10.5 13.5 10.5H8L5.5 13V10.7L2.7 10.6C2.42 10.6 2.2 10.38 2.2 10.1V4C2.2 3.72 2.42 3.5 2.7 3.5H2.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconFavorites() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4.5 2.5H11.5C11.78 2.5 12 2.72 12 3V13.5L8 11L4 13.5V3C4 2.72 4.22 2.5 4.5 2.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconProfile() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 13C3 10.6 5 9 8 9C11 9 13 10.6 13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Beranda", href: "/dashboard", icon: <IconDashboard /> },
  { label: "Marketplace", href: "/marketplace", icon: <IconMarketplace /> },
  { label: "Jasa & Layanan", href: "/services", icon: <IconServices /> },
  { label: "Info Kost", href: "/kost", icon: <IconKost /> },
  { label: "Barang Hilang", href: "/lost-found", icon: <IconLostFound /> },
  { label: "Event & Info", href: "/events/create", icon: <IconEvent /> },
];

const ACTIVITY_NAV_ITEMS: NavItem[] = [
  { label: "Pesan", href: "/messages", icon: <IconMessages />, badge: "2" },
  { label: "Tersimpan", href: "/favorites", icon: <IconFavorites /> },
  { label: "Profil Saya", href: "/profile", icon: <IconProfile /> },
];

function NavLink({
  item,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
        isActive
          ? "bg-slate-100 text-slate-900"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <span className={isActive ? "text-slate-900" : "text-slate-500"}>{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span
          className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
            isActive ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
          }`}
          aria-label={`${item.badge} pesan belum dibaca`}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage on mount is required
    setUser(getUser());
    setChecked(true);
  }, [router]);

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  function handleCreateClick() {
    setMobileOpen(false);
    if (pathname?.startsWith("/services")) {
      router.push("/services?action=create");
    } else if (pathname?.startsWith("/kost")) {
      router.push("/kost?action=create");
    } else if (pathname?.startsWith("/lost-found") || pathname?.startsWith("/lost-and-found")) {
      router.push("/lost-found?action=create");
    } else if (pathname?.startsWith("/events")) {
      router.push("/events/create");
    } else {
      router.push("/marketplace?action=create");
    }
  }

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB]">
        <p className="text-sm text-slate-500">Memeriksa sesi…</p>
      </div>
    );
  }

  const displayName =
    (user?.profile && typeof user.profile === "object" && "name" in user.profile
      ? (user.profile as { name?: string }).name
      : null) || user?.name || "Alex Rivera";
  const displayFaculty =
    (user?.profile && typeof user.profile === "object" && "faculty" in user.profile
      ? (user.profile as { faculty?: string | null }).faculty
      : null) || "Informatika '21";
  const displayEmail = typeof user?.email === "string" ? user.email : "";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Tutup navigasi"
          className="fixed inset-0 z-30 bg-slate-900/20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-[64px] items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            U
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-none tracking-tight text-slate-900">
              UPN Hub
            </p>
            <p className="mt-0.5 text-[11px] font-medium tracking-wide text-slate-500">Portal Mahasiswa</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigasi utama">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Menu Utama
          </p>
          <ul className="space-y-1">
            {MAIN_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  isActive={pathname === item.href}
                  onNavigate={() => setMobileOpen(false)}
                />
              </li>
            ))}
          </ul>

          <p className="px-3 pb-2 pt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Aktivitas Saya
          </p>
          <ul className="space-y-1">
            {ACTIVITY_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  isActive={pathname === item.href}
                  onNavigate={() => setMobileOpen(false)}
                />
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom CTA + user summary */}
        <div className="border-t border-slate-200 px-4 py-4">
          <button
            type="button"
            onClick={handleCreateClick}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <IconPlus /> Pasang Iklan
          </button>
          <div className="mt-3 flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-slate-900">{displayName}</p>
              <p className="truncate text-xs text-slate-500">{displayFaculty}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex w-full items-center justify-center rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-[260px]">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-[64px] items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
            aria-label="Buka navigasi"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="block h-3.5 w-3.5">
              <span className="block h-0.5 w-full bg-current" />
              <span className="mt-1 block h-0.5 w-full bg-current" />
              <span className="mt-1 block h-0.5 w-full bg-current" />
            </span>
          </button>

          {/* Search */}
          <div className="flex flex-1 items-center">
            <label htmlFor="dashboard-search" className="sr-only">
              Cari
            </label>
            <div className="relative w-full max-w-[420px]">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </span>
              <input
                id="dashboard-search"
                placeholder="Cari buku, kost, jasa skripsi..."
                className="h-9 w-full rounded border border-slate-200 bg-[#F8F9FB] py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="Notifikasi"
              className="relative inline-flex h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 2.5C5.7 2.5 4 4 4 6V10L3 11.5H13L12 10V6C12 4 10.3 2.5 8 2.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M6.5 13C6.5 13.8 7.1 14.5 8 14.5C8.9 14.5 9.5 13.8 9.5 13H6.5Z" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Bantuan"
              className="hidden h-8 w-8 items-center justify-center rounded text-slate-500 hover:bg-slate-50 hover:text-slate-700 sm:inline-flex"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M7.2 7.2C7.2 6.1 8.1 5.3 9.2 5.3C10.3 5.3 11 6 11 7C11 8.2 10 8.6 9.4 9.1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <circle cx="8" cy="11.2" r="0.7" fill="currentColor" />
              </svg>
            </button>
            <div className="hidden items-center gap-3 sm:flex">
              <div className="h-6 w-px bg-slate-200" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-semibold leading-none text-slate-900">{displayName}</p>
                  <p className="mt-0.5 text-[11px] leading-none text-slate-500">{displayEmail || displayFaculty}</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                  {initials}
                </div>
              </div>
            </div>
            {/* Mobile user */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white sm:hidden">
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
