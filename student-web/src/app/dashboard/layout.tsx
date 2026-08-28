"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getToken, clearAuth, getUser, type AuthUser } from "@/lib/auth";

type NavItem = {
  label: string;
  href: string;
  isLogout?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "Services", href: "/services" },
  { label: "Kost", href: "/kost" },
];

export default function DashboardLayout({
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

  // Prevent flash of dashboard before auth check
  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking session…</p>
      </div>
    );
  }

  const displayName =
    (user?.profile && typeof user.profile === "object" && "name" in user.profile
      ? (user.profile as { name?: string }).name
      : null) || user?.name || "Student";
  const displayEmail = typeof user?.email === "string" ? user.email : "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-gray-900/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex h-14 items-center gap-3 border-b border-gray-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-900 text-xs font-bold tracking-tight text-white">
            UPN
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none tracking-tight text-gray-900">
              UPN Student Hub
            </p>
            <p className="text-xs text-gray-500">Student Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Menu
          </p>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-gray-900 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-200 px-4 py-4">
          <p className="truncate text-sm font-medium text-gray-900">{displayName}</p>
          {displayEmail && (
            <p className="truncate text-xs text-gray-500">{displayEmail}</p>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-[260px]">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:px-6">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="block h-3.5 w-3.5">
              {/* simple hamburger lines */}
              <span className="block h-0.5 w-full bg-current" />
              <span className="mt-1 block h-0.5 w-full bg-current" />
              <span className="mt-1 block h-0.5 w-full bg-current" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-gray-900">Dashboard</h1>
            <p className="hidden text-xs text-gray-500 sm:block">
              Welcome back — manage your activity in UPN Student Hub
            </p>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="max-w-[160px] truncate text-sm font-medium text-gray-700">
              {displayName}
            </span>
            <span className="h-7 w-px bg-gray-200" aria-hidden="true" />
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
