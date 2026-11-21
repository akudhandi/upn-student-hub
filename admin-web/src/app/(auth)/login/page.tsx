"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/lib/admin-api";
import { extractAdminError } from "@/lib/api";
import { getAdminToken, setAdminSession } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sudah login → langsung ke dashboard (tanpa setState di effect).
  useEffect(() => {
    if (getAdminToken()) {
      router.replace("/");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await adminLogin(email.trim(), password);
      setAdminSession(res.token, res.admin);
      router.replace("/");
    } catch (err) {
      setError(
        extractAdminError(err, "Login gagal. Coba lagi.", {
          statusMessages: {
            401: "Email atau kata sandi salah.",
          },
        }),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-[#F4F1EE] text-[#141416]">
      <div className="auth-shell-enter m-auto w-full max-w-md px-5 py-12">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#141416] text-white">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 1.5L9.8 6.2L14.5 8L9.8 9.8L8 14.5L6.2 9.8L1.5 8L6.2 6.2L8 1.5Z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="font-display text-[15px] font-semibold tracking-tight text-[#141416]">
              UPN Student Hub
            </p>
            <p className="text-xs font-medium text-[#6E6A66]">
              Portal Administrasi
            </p>
          </div>
        </div>

        <section className="rounded-[24px] border border-[#E5E0DA] bg-white p-6 shadow-[0_24px_60px_-36px_rgba(20,20,22,0.18)] sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#141416]">
            Masuk Admin
          </h1>
          <p className="mt-1 text-sm text-[#6E6A66]">
            Gunakan kredensial administrator untuk mengelola ekosistem kampus.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-[#F3C6C6] bg-[#FDECEC] px-3.5 py-2.5 text-sm font-medium text-[#A62D2D]"
            >
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-semibold text-[#57534E]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@upnjatim.ac.id"
                className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-semibold text-[#57534E]"
              >
                Kata sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3.5 py-2.5 pr-20 text-sm text-[#141416] outline-none transition placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-semibold text-[#6E6A66] transition-colors hover:text-[#141416]"
                >
                  {showPassword ? "Sembunyi" : "Tampil"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded-full bg-[#141416] px-5 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-[1px] hover:bg-[#242428] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Memeriksa…" : "Masuk ke Portal Admin"}
            </button>
          </form>
        </section>

        <p className="mt-6 text-center text-xs text-[#787470]">
          © 2026 UPN &quot;Veteran&quot; Jawa Timur — Student Hub Management System
        </p>
      </div>
    </main>
  );
}
