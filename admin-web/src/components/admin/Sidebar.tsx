"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  superadminOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function icon(path: string) {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d={path}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Utama",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: icon(
          "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
        ),
      },
    ],
  },
  {
    title: "Konten",
    items: [
      {
        label: "Marketplace",
        href: "/marketplace",
        icon: icon("M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"),
      },
      {
        label: "Jasa Mahasiswa",
        href: "/jasa",
        icon: icon(
          "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
        ),
      },
      {
        label: "Kost",
        href: "/kost",
        icon: icon(
          "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
        ),
      },
      {
        label: "Lost & Found",
        href: "/lost-found",
        icon: icon(
          "M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z",
        ),
      },
      {
        label: "Event & Informasi",
        href: "/events",
        icon: icon(
          "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
        ),
      },
    ],
  },
  {
    title: "Komunitas",
    items: [
      {
        label: "Users",
        href: "/users",
        icon: icon(
          "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
        ),
      },
      {
        label: "Reports / Moderasi",
        href: "/reports",
        icon: icon(
          "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
        ),
      },
    ],
  },
  {
    title: "Sistem",
    items: [
      {
        label: "Categories",
        href: "/categories",
        icon: icon(
          "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z",
        ),
      },
      {
        label: "Notifications",
        href: "/notifications",
        icon: icon(
          "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
        ),
      },
      {
        label: "Pengaturan",
        href: "/settings",
        icon: icon(
          "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
        ),
      },
      {
        label: "Kelola Admin",
        href: "/admins",
        superadminOnly: true,
        icon: icon(
          "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
        ),
      },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({
  open,
  onClose,
  showAdminNav,
}: {
  open: boolean;
  onClose: () => void;
  showAdminNav: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          aria-label="Tutup navigasi"
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 shrink-0 select-none flex-col border-r border-slate-800/80 bg-brand-sidebar text-slate-300 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigasi admin"
      >
        <div className="flex h-20 items-center gap-3.5 border-b border-slate-800/60 bg-brand-navy/60 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-lg font-extrabold text-white shadow-md shadow-sky-500/20 ring-1 ring-white/20">
            U
          </div>
          <div className="leading-tight">
            <h1 className="text-[15px] font-bold tracking-tight text-white">
              UPN Student Hub
            </h1>
            <p className="text-xs font-medium tracking-wide text-slate-400">
              Admin Portal
            </p>
          </div>
        </div>

        <nav className="sidebar-scroll flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {group.title}
              </p>
              <div className="mt-2 space-y-1">
                {group.items
                  .filter((item) => !item.superadminOnly || showAdminNav)
                  .map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? "flex items-center gap-3 rounded-lg border-l-4 border-sky-400 bg-gradient-to-r from-brand-active to-brand-active/80 px-3 py-2.5 font-medium text-white shadow-sm"
                          : "flex items-center gap-3 rounded-lg px-3 py-2 text-slate-300 transition hover:bg-brand-hover hover:text-white"
                      }
                    >
                      <span className={active ? "text-sky-400" : "text-slate-400"}>
                        {item.icon}
                      </span>
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800 bg-[#071324] p-3">
          <a
            className="group flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/80 p-2.5 transition hover:bg-slate-700/80"
            href={process.env.NEXT_PUBLIC_STUDENT_URL || "http://localhost:3000"}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-600/30 font-bold text-emerald-400">
              N
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white transition group-hover:text-sky-300">
                Kembali ke Portal
              </p>
              <p className="truncate text-[11px] font-medium text-slate-400">
                Mahasiswa Active
              </p>
            </div>
          </a>
        </div>
      </aside>
    </>
  );
}
