"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { adminLogin } from "@/lib/admin-api";
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
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const message = (err.response?.data as { message?: string } | undefined)
          ?.message;
        if (status === 401) {
          setError("Email atau kata sandi salah.");
        } else if (status === 422) {
          setError(message ?? "Periksa kembali email dan kata sandi.");
        } else if (!err.response) {
          setError("Tidak dapat menghubungi server. Pastikan backend berjalan.");
        } else {
          setError(message ?? "Login gagal. Coba lagi.");
        }
      } else {
        setError("Login gagal. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-brand-sidebar">
      <div className="m-auto w-full max-w-md px-6 py-12">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-xl font-extrabold text-white shadow-md shadow-sky-500/20 ring-1 ring-white/20">
            U
          </div>
          <div className="leading-tight">
            <p className="text-[15px] font-bold tracking-tight text-white">
              UPN Student Hub
            </p>
            <p className="text-xs font-medium tracking-wide text-slate-400">
              Admin Portal
            </p>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-8">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Masuk Admin
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gunakan kredensial admin lokal untuk mengelola platform.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700"
            >
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
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
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-semibold text-slate-700"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-slate-500 transition hover:text-slate-800"
                >
                  {showPassword ? "Sembunyi" : "Tampil"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Memeriksa…" : "Masuk"}
            </button>
          </form>
        </section>

        <p className="mt-6 text-center text-xs text-slate-500">
          © 2026 UPN &quot;Veteran&quot; — Student Hub Management System
        </p>
      </div>
    </main>
  );
}
