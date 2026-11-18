"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  getToken,
  clearAuth,
  getUser,
  USER_UPDATED_EVENT,
  type AuthUser,
} from "@/lib/auth";
import { logout } from "@/lib/api";
import { fetchConversations } from "@/lib/interactions";
import { resolveStorageUrl } from "@/lib/images";
import DevUserSwitcher from "@/components/DevUserSwitcher";
import NotificationBell from "@/components/NotificationBell";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
};

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1.2" fill="currentColor" />
    </svg>
  );
}
function IconMarketplace() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 8h12l-1 11H7L6 8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9.5 8V6.5a2.5 2.5 0 015 0V8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconServices() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3l2.2 5.3L19.5 10l-5.3 1.8L12 17l-2.2-5.2L4.5 10l5.3-1.7L12 3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}
function IconLostFound() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconEvent() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="5.5" width="16" height="14.5" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5v3M16 3.5v3M4 10h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconMessages() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 3.5H13.5C13.78 3.5 14 3.72 14 4V10C14 10.28 13.78 10.5 13.5 10.5H8L5.5 13V10.7L2.7 10.6C2.42 10.6 2.2 10.38 2.2 10.1V4C2.2 3.72 2.42 3.5 2.7 3.5H2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
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
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function IconProfile() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M3 13C3 10.6 5 9 8 9C11 9 13 10.6 13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Beranda", href: "/dashboard", icon: <IconDashboard /> },
  { label: "Marketplace", href: "/marketplace", icon: <IconMarketplace /> },
  { label: "Jasa & Layanan", href: "/services", icon: <IconServices /> },
  { label: "Barang Hilang", href: "/lost-found", icon: <IconLostFound /> },
  { label: "Event & Info", href: "/events", icon: <IconEvent /> },
];

const ACTIVITY_NAV_ITEMS: NavItem[] = [
  { label: "Pesan", href: "/messages", icon: <IconMessages /> },
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
      className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isActive
          ? "border border-[#E5E0DA] bg-white text-[#141416] shadow-[0_4px_14px_-6px_rgba(20,20,22,0.12)]"
          : "border border-transparent text-[#6E6A66] hover:bg-white/65 hover:text-[#141416]"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <span
        className={`transition-colors ${
          isActive ? "text-[#141416]" : "text-[#85817C] group-hover:text-[#141416]"
        }`}
      >
        {item.icon}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span
          className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
            isActive ? "bg-[#141416] text-white" : "bg-[#E4DFDA] text-[#141416]"
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
  const [searchInput, setSearchInput] = useState("");
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage on mount is required
    setUser(getUser());
    setChecked(true);

    function syncUser() {
      setUser(getUser());
    }
    window.addEventListener(USER_UPDATED_EVENT, syncUser);
    return () => {
      window.removeEventListener(USER_UPDATED_EVENT, syncUser);
    };
  }, [router]);

  useEffect(() => {
    if (!checked) return;
    let cancelled = false;

    function loadUnread() {
      fetchConversations()
        .then((list) => {
          if (cancelled) return;
          const total = list.reduce((sum, item) => sum + (item.unread_count || 0), 0);
          setUnreadMessagesCount(total);
        })
        .catch(() => {
          // Ignore transient network errors for badge
        });
    }

    loadUnread();
    window.addEventListener("upn-messages-updated", loadUnread);
    return () => {
      cancelled = true;
      window.removeEventListener("upn-messages-updated", loadUnread);
    };
  }, [checked, pathname]);

  async function handleLogout() {
    try {
      const token = getToken();
      if (token && token !== "dev-token") {
        await logout();
      }
    } catch {
      // Token may already be expired/revoked; still clear local session
    } finally {
      clearAuth();
      router.replace("/login");
    }
  }

  function isNavActive(href: string): boolean {
    if (!pathname) return false;
    if (pathname === href) return true;
    if (href === "/lost-found" && pathname.startsWith("/lost-and-found")) return true;
    return pathname.startsWith(`${href}/`);
  }

  function handleCreateClick() {
    setMobileOpen(false);
    if (pathname?.startsWith("/services")) {
      router.push("/services?action=create");
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
      <div className="flex min-h-screen items-center justify-center bg-[#F4F1EE]">
        <p className="text-sm font-medium text-[#787470]">Memeriksa sesi…</p>
      </div>
    );
  }

  const displayName =
    (user?.profile && typeof user.profile === "object" && "name" in user.profile
      ? (user.profile as { name?: string }).name
      : null) || user?.name || "Mahasiswa UPN";
  const displayFaculty =
    (user?.profile && typeof user.profile === "object" && "faculty" in user.profile
      ? (user.profile as { faculty?: string | null }).faculty
      : null) || "Mahasiswa UPN";
  const avatarPath =
    user?.profile && typeof user.profile === "object" && "avatar" in user.profile
      ? (user.profile as { avatar?: string | null }).avatar
      : null;
  const avatarUrl = avatarPath ? resolveStorageUrl(avatarPath) : null;
  const displayEmail = typeof user?.email === "string" ? user.email : "";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#F4F1EE] text-[#141416] selection:bg-[#141416] selection:text-white">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Tutup navigasi"
          className="fixed inset-0 z-30 bg-[#141416]/25 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Warm Stone Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-[#E6E1DC] bg-[#EFECE8] transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <Link
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
          className="group flex h-[72px] items-center gap-3 px-5"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#141416] text-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 1.5L9.8 6.2L14.5 8L9.8 9.8L8 14.5L6.2 9.8L1.5 8L6.2 6.2L8 1.5Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold leading-none tracking-tight text-[#141416]">
              UPN Hub
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#787470]">
              Portal Mahasiswa
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-2" aria-label="Navigasi utama">
          <p className="px-3.5 pb-2 text-[11px] font-medium text-[#8C8782]">
            Menu Utama
          </p>
          <ul className="space-y-1">
            {MAIN_NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  isActive={isNavActive(item.href)}
                  onNavigate={() => setMobileOpen(false)}
                />
              </li>
            ))}
          </ul>

          <p className="px-3.5 pb-2 pt-6 text-[11px] font-medium text-[#8C8782]">
            Aktivitas Saya
          </p>
          <ul className="space-y-1">
            {ACTIVITY_NAV_ITEMS.map((item) => {
              const resolvedItem =
                item.href === "/messages" && unreadMessagesCount > 0
                  ? { ...item, badge: String(unreadMessagesCount) }
                  : item;
              return (
                <li key={item.href}>
                  <NavLink
                    item={resolvedItem}
                    isActive={isNavActive(item.href)}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom CTA + user summary */}
        <div className="border-t border-[#E4DFDA] p-4">
          <button
            type="button"
            onClick={handleCreateClick}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#141416] px-4 text-xs font-medium text-white transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#242428] hover:shadow-[0_10px_22px_-10px_rgba(20,20,22,0.38)] active:translate-y-0 active:scale-[0.99]"
          >
            <IconPlus /> {pathname?.startsWith("/events") ? "Ajukan Event" : "Pasang Iklan"}
          </button>

          <div className="mt-3.5 flex items-center gap-2.5 rounded-2xl border border-[#E5E0DA] bg-white p-2.5">
            <Link
              href="/profile"
              onClick={() => setMobileOpen(false)}
              className="flex min-w-0 flex-1 items-center gap-2.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#141416] text-[11px] font-semibold text-white">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#141416]">{displayName}</p>
                <p className="truncate text-[11px] text-[#787470]">{displayFaculty}</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar dari akun"
              aria-label="Keluar dari akun"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#787470] transition-colors hover:bg-[#F4F1EE] hover:text-[#C53939]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M15 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H3"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-[264px]">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-[#E6E1DC]/80 bg-[#F4F1EE]/90 px-4 backdrop-blur-md lg:px-8">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E0DA] bg-white text-[#141416] transition-colors hover:bg-[#FAF8F6] lg:hidden"
            aria-label="Buka navigasi"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Pill Search Bar */}
          <form
            className="flex flex-1 items-center"
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchInput.trim();
              const targetBase = pathname?.startsWith("/services")
                ? "/services"
                : pathname?.startsWith("/lost-found") || pathname?.startsWith("/lost-and-found")
                  ? "/lost-found"
                  : pathname?.startsWith("/events")
                    ? "/events"
                    : "/marketplace";
              if (!q) {
                router.push(targetBase);
                return;
              }
              router.push(`${targetBase}?q=${encodeURIComponent(q)}`);
            }}
          >
            <label htmlFor="dashboard-search" className="sr-only">
              Cari
            </label>
            <div className="relative w-full max-w-[440px]">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#85817C]">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </span>
              <input
                id="dashboard-search"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari barang, jasa, laporan, atau event…"
                className="h-10 w-full rounded-full border border-[#E5E0DA] bg-white/90 py-2 pl-10 pr-4 text-xs text-[#141416] placeholder:text-[#9A958F] transition-all duration-200 focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)] focus:outline-none sm:text-[13px]"
              />
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <DevUserSwitcher />
            <NotificationBell />
            <Link
              href="/profile"
              className="hidden items-center gap-2.5 rounded-full border border-[#E5E0DA] bg-white py-1 pl-1.5 pr-3.5 transition-all duration-200 hover:-translate-y-[1px] hover:border-[#D5CEC6] hover:shadow-xs sm:inline-flex"
            >
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#141416] text-[11px] font-semibold text-white">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="text-left">
                <p className="max-w-[130px] truncate text-xs font-semibold leading-tight text-[#141416]">
                  {displayName}
                </p>
                <p className="max-w-[130px] truncate text-[10px] leading-tight text-[#787470]">
                  {displayFaculty || displayEmail}
                </p>
              </div>
            </Link>
            {/* Mobile user avatar */}
            <Link
              href="/profile"
              aria-label="Profil saya"
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#141416] text-xs font-semibold text-white sm:hidden"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="px-4 py-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
