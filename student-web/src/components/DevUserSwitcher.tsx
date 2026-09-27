"use client";

import { useEffect, useRef, useState } from "react";
import { getUser, setAuth, getToken, type AuthUser } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Dev-only user switcher for 1-on-1 chat testing. Swaps the client-side mock
// user between two seeded accounts so the self-chat guard can be exercised
// (own listing vs other user's listing) without a second browser/login.
// Rendered only in development builds; never in production.
// ---------------------------------------------------------------------------

const DEV_USERS: AuthUser[] = [
  { id: 1, name: "Nikko Grimes IV", email: "buckridge.antoinette@example.net" },
  { id: 2, name: "Tomasa Okuneva", email: "brett.welch@example.net" },
];

const DEV_ROLE_LABEL: Record<number, string> = {
  1: "Owner",
  2: "Pembeli / Penemu",
};

export default function DevUserSwitcher() {
  const [open, setOpen] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate current user on mount
    setCurrentId(getUser()?.id ?? null);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open ]);

  if (process.env.NODE_ENV === "production") return null;

  function switchTo(user: AuthUser) {
    // Preserve the existing session token; only the mock identity changes.
    // The backend resolves guests to a default user, so this switch drives
    // client-side ownership guards (ChatButton self-chat state, etc.).
    setAuth(getToken() ?? "dev-token", user);
    window.location.reload();
  }

  const current = DEV_USERS.find((u) => u.id === currentId) ?? null;

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Ganti pengguna dev"
        title="Dev: ganti pengguna untuk uji chat"
        className="inline-flex h-8 items-center gap-1.5 rounded border border-dashed border-amber-400 bg-amber-50 px-2 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
      >
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {current ? `Dev: ${current.name.split(" ")[0]} (#${current.id})` : "Dev: User"}
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Pilih pengguna dev"
          className="absolute right-0 z-50 mt-1.5 w-64 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          {DEV_USERS.map((user) => {
            const selected = user.id === currentId;
            return (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => switchTo(user)}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  selected ? "bg-amber-50" : "hover:bg-slate-50"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                  #{user.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900">{user.name}</span>
                  <span className="block truncate text-slate-500">{DEV_ROLE_LABEL[user.id]}</span>
                </span>
                {selected && (
                  <span className="shrink-0 text-[11px] font-bold text-amber-700">Aktif</span>
                )}
              </button>
            );
          })}
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] leading-4 text-slate-400">
            Hanya untuk development. Mengganti mock user lokal lalu memuat ulang halaman.
          </p>
        </div>
      )}
    </div>
  );
}
