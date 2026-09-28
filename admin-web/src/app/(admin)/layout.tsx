"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import {
  clearAdminSession,
  getAdminSessionSnapshot,
  parseAdminSession,
  subscribeAdminSession,
} from "@/lib/auth";
import { adminLogout } from "@/lib/admin-api";

function getServerSessionSnapshot(): string {
  return "";
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const snapshot = useSyncExternalStore(
    subscribeAdminSession,
    getAdminSessionSnapshot,
    getServerSessionSnapshot,
  );
  const session = parseAdminSession(snapshot);
  const loggedOut = session === null;
  const adminName =
    session?.admin?.name || session?.admin?.email || "Administrator";

  // Guard: tanpa token kembali ke login. Tanpa setState sehingga tidak
  // memicu cascading render.
  useEffect(() => {
    if (loggedOut) {
      router.replace("/login");
    }
  }, [loggedOut, router]);

  const handleLogout = useCallback(async () => {
    try {
      await adminLogout();
    } catch {
      // Token kedaluwarsa/invalid: tetap bersihkan sesi lokal.
    } finally {
      clearAdminSession();
      router.replace("/login");
    }
  }, [router]);

  if (loggedOut) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <p className="text-sm font-medium text-slate-500">Memuat…</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        <Topbar
          adminName={adminName}
          onMenu={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />
        <div className="flex flex-1 flex-col">
          {children}
          <footer className="mt-auto border-t border-slate-200/80 bg-white px-8 py-4 text-center text-xs text-slate-400 sm:flex sm:justify-between sm:text-left">
            <p>© 2026 UPN &quot;Veteran&quot; — Student Hub Management System.</p>
            <div className="mt-2 flex justify-center gap-4 sm:mt-0">
              <Link href="/settings" className="hover:underline">
                Privasi &amp; Keamanan
              </Link>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={handleLogout}
                className="hover:underline"
              >
                Keluar
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
