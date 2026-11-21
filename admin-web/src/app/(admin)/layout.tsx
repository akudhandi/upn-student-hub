"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import {
  clearAdminSession,
  getAdminSessionSnapshot,
  getServerAdminSessionSnapshot,
  parseAdminSession,
  subscribeAdminSession,
} from "@/lib/auth";
import { adminLogout } from "@/lib/admin-api";

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
    getServerAdminSessionSnapshot,
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
      <main className="flex min-h-screen items-center justify-center bg-[#F4F1EE]">
        <p className="text-sm font-medium text-[#6E6A66]">Memuat…</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F4F1EE] text-[#141416]">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        showAdminNav={session?.admin?.role === "superadmin"}
      />
      <div className="flex min-h-screen flex-1 flex-col lg:ml-[264px]">
        <Topbar
          adminName={adminName}
          onMenu={() => setSidebarOpen(true)}
          onLogout={handleLogout}
        />
        <div className="flex flex-1 flex-col">
          {children}
          <footer className="mt-auto border-t border-[#E5E0DA] bg-[#F4F1EE] px-6 py-4 text-center text-xs text-[#6E6A66] sm:flex sm:justify-between sm:px-8 sm:text-left">
            <p>© 2026 UPN &quot;Veteran&quot; — Student Hub Management System.</p>
            <div className="mt-2 flex justify-center gap-4 sm:mt-0">
              <Link
                href="/settings"
                className="transition-colors hover:text-[#141416] hover:underline"
              >
                Privasi &amp; Keamanan
              </Link>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={handleLogout}
                className="transition-colors hover:text-[#141416] hover:underline"
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
