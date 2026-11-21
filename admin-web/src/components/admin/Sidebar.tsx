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
      className="h-[17px] w-[17px] shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d={path}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
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
          className="fixed inset-0 z-30 bg-[#141416]/25 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] shrink-0 select-none flex-col border-r border-[#E5E0DA] bg-[#EFECE8] text-[#57534E] transition-transform duration-200 ease-[cubic-bezier(.2,.8,.2,1)] lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigasi admin"
      >
        <Link
          href="/"
          onClick={onClose}
          className="group flex h-[72px] items-center gap-3 px-5 focus-visible:outline-none"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#141416] text-white transition-transform duration-150 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:-translate-y-[1px]">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 1.5L9.8 6.2L14.5 8L9.8 9.8L8 14.5L6.2 9.8L1.5 8L6.2 6.2L8 1.5Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-[15px] font-semibold leading-none tracking-tight text-[#141416]">
              UPN Hub
            </h1>
            <p className="mt-1 text-[13px] font-medium text-[#6E6A66]">
              Portal Admin
            </p>
          </div>
        </Link>

        <nav className="sidebar-scroll flex-1 space-y-5 overflow-y-auto px-3.5 py-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3.5 pb-1.5 text-[12px] font-medium text-[#787470]">
                {group.title}
              </p>
              <div className="space-y-1">
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
                        className={`group flex min-h-[40px] items-center gap-3 rounded-xl px-3.5 py-2 text-[14px] font-medium transition-all duration-150 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416] ${
                          active
                            ? "border border-[#E5E0DA] bg-white text-[#141416] shadow-[0_4px_14px_-6px_rgba(20,20,22,0.10)]"
                            : "border border-transparent text-[#57534E] hover:bg-white/70 hover:text-[#141416]"
                        }`}
                      >
                        <span
                          className={`transition-colors ${
                            active
                              ? "text-[#141416]"
                              : "text-[#787470] group-hover:text-[#141416]"
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#E4DFDA] p-4">
          <a
            className="group flex items-center gap-3 rounded-xl border border-[#E5E0DA] bg-white p-2.5 transition-all duration-150 hover:border-[#CFC8BF] hover:bg-[#FAF8F6]"
            href={process.env.NEXT_PUBLIC_STUDENT_URL || "http://localhost:3000"}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F4F1EE] text-[#141416] transition-colors group-hover:bg-[#141416] group-hover:text-white">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#141416]">
                Kembali ke Portal
              </p>
              <p className="truncate text-xs font-medium text-[#6E6A66]">
                Portal Mahasiswa
              </p>
            </div>
          </a>
        </div>
      </aside>
    </>
  );
}
