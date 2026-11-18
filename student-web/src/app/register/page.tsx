"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AuthSplitShell,
  FieldErrorMessage,
  PasswordEyeButton,
} from "@/components/AuthSplitShell";
import { register, type ApiError } from "@/lib/api";
import { setAuth } from "@/lib/auth";

const FAKULTAS_OPTIONS = [
  "Fakultas Ilmu Komputer",
  "Fakultas Teknik",
  "Fakultas Ekonomi & Bisnis",
  "Fakultas Pertanian",
  "Fakultas Ilmu Sosial & Politik",
  "Fakultas Arsitektur & Desain",
  "Fakultas Hukum",
  "Fakultas Kedokteran",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALPHA_SPACE_RE = /^[A-Za-z\s]+$/;
const NPM_RE = /^\d{11}$/;

type RegisterField =
  | "fullName"
  | "npm"
  | "faculty"
  | "email"
  | "password"
  | "confirmPassword";

function FacultyDropdown({
  value,
  disabled,
  hasError,
  onChange,
  onBlurTrigger,
}: {
  value: string;
  disabled: boolean;
  hasError: boolean;
  onChange: (val: string) => void;
  onBlurTrigger: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        onBlurTrigger();
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        onBlurTrigger();
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onBlurTrigger]);

  return (
    <div ref={containerRef} className="relative mt-1">
      <button
        id="reg-faculty"
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (open) onBlurTrigger();
          setOpen((v) => !v);
        }}
        className={`flex w-full items-center justify-between border-0 border-b bg-transparent px-0 py-1.5 text-left text-sm transition-colors focus:outline-none ${
          hasError
            ? "border-rose-400 focus:border-rose-600"
            : open
              ? "border-slate-900"
              : "border-slate-300 focus:border-slate-900"
        }`}
      >
        <span className={value ? "truncate text-slate-900" : "truncate text-slate-300"}>
          {value || "Pilih fakultas…"}
        </span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className={`shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180 text-slate-700" : ""
          }`}
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby="reg-faculty-label"
          className="absolute left-0 right-0 z-30 mt-1.5 max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.18)]"
        >
          {FAKULTAS_OPTIONS.map((opt) => {
            const selected = value === opt;
            return (
              <li key={opt} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    onBlurTrigger();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors ${
                    selected
                      ? "bg-[#18191B] text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{opt}</span>
                  {selected && (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 8.5L6.5 11.5L12.5 5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [npm, setNpm] = useState("");
  const [faculty, setFaculty] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<RegisterField, boolean>>>(
    {}
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function markTouched(field: RegisterField) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  const nameError = useMemo(() => {
    const trimmed = fullName.trim();
    if (!trimmed) return "Nama lengkap wajib diisi.";
    if (!ALPHA_SPACE_RE.test(trimmed)) {
      return "Nama lengkap hanya boleh berisi huruf alfabet.";
    }
    if (trimmed.length < 2) return "Nama lengkap minimal 2 huruf.";
    return null;
  }, [fullName]);

  const npmError = useMemo(() => {
    if (!npm) return "NPM wajib diisi.";
    if (!NPM_RE.test(npm)) {
      return `NPM harus 11 digit angka (${npm.length}/11).`;
    }
    return null;
  }, [npm]);

  const facultyError = useMemo(() => {
    if (!faculty) return "Fakultas wajib dipilih.";
    return null;
  }, [faculty]);

  const emailError = useMemo(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return "Email kampus wajib diisi.";
    if (!EMAIL_RE.test(trimmed)) {
      return "Format email tidak valid (contoh: nama@student.upnjatim.ac.id).";
    }
    if (!trimmed.endsWith("@student.upnjatim.ac.id")) {
      return "Email wajib menggunakan domain @student.upnjatim.ac.id.";
    }
    return null;
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return "Password wajib diisi.";
    if (password.length < 8) {
      return `Password minimal 8 karakter (${password.length}/8).`;
    }
    return null;
  }, [password]);

  const confirmError = useMemo(() => {
    if (!confirmPassword) return "Konfirmasi password wajib diisi.";
    if (confirmPassword !== password) return "Konfirmasi password tidak cocok.";
    return null;
  }, [confirmPassword, password]);

  const showNameError = touched.fullName || submitAttempted ? nameError : null;
  const showNpmError = touched.npm || submitAttempted ? npmError : null;
  const showFacultyError =
    touched.faculty || submitAttempted ? facultyError : null;
  const showEmailError = touched.email || submitAttempted ? emailError : null;
  const showPasswordError =
    touched.password || submitAttempted ? passwordError : null;
  const showConfirmError =
    touched.confirmPassword || submitAttempted ? confirmError : null;

  const hasValidationError = Boolean(
    nameError ||
      npmError ||
      facultyError ||
      emailError ||
      passwordError ||
      confirmError
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitAttempted(true);

    if (hasValidationError) {
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: fullName.trim().replace(/\s+/g, " "),
        email: email.trim().toLowerCase(),
        password,
        password_confirmation: confirmPassword,
        nim: npm,
        faculty,
      });
      if (res.token && res.user) {
        setAuth(res.token, res.user);
      }
      router.push("/dashboard");
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.errors) {
        const firstFieldError = Object.values(apiError.errors).flat()[0];
        setError(firstFieldError || apiError.message);
      } else {
        setError(apiError.message || "Gagal membuat akun. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  function inputClass(hasErr: boolean): string {
    return `mt-1 w-full border-0 border-b bg-transparent px-0 py-1.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none ${
      hasErr
        ? "border-rose-400 focus:border-rose-600"
        : "border-slate-300 focus:border-slate-900"
    }`;
  }

  return (
    <AuthSplitShell
      title="Buat Akun Mahasiswa"
      subtitle="Daftar menggunakan email resmi @student.upnjatim.ac.id"
      footer={
        <>
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-semibold text-slate-900 underline-offset-4 hover:underline"
          >
            Masuk di sini
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="reg-fullname"
              className="block text-[11px] font-medium text-slate-500"
            >
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              id="reg-fullname"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Budi Santoso"
              value={fullName}
              onChange={(e) =>
                setFullName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))
              }
              onBlur={() => markTouched("fullName")}
              disabled={loading}
              aria-invalid={Boolean(showNameError)}
              className={inputClass(Boolean(showNameError))}
            />
            <FieldErrorMessage message={showNameError} />
          </div>

          <div>
            <label
              htmlFor="reg-npm"
              className="block text-[11px] font-medium text-slate-500"
            >
              NPM <span className="text-rose-500">*</span>
            </label>
            <input
              id="reg-npm"
              name="npm"
              type="text"
              inputMode="numeric"
              maxLength={11}
              autoComplete="off"
              placeholder="22081010001"
              value={npm}
              onChange={(e) =>
                setNpm(e.target.value.replace(/\D/g, "").slice(0, 11))
              }
              onBlur={() => markTouched("npm")}
              disabled={loading}
              aria-invalid={Boolean(showNpmError)}
              className={inputClass(Boolean(showNpmError))}
            />
            <FieldErrorMessage message={showNpmError} />
          </div>
        </div>

        <div>
          <span
            id="reg-faculty-label"
            className="block text-[11px] font-medium text-slate-500"
          >
            Fakultas <span className="text-rose-500">*</span>
          </span>
          <FacultyDropdown
            value={faculty}
            disabled={loading}
            hasError={Boolean(showFacultyError)}
            onChange={(val) => setFaculty(val)}
            onBlurTrigger={() => markTouched("faculty")}
          />
          <FieldErrorMessage message={showFacultyError} />
        </div>

        <div>
          <label
            htmlFor="reg-email"
            className="block text-[11px] font-medium text-slate-500"
          >
            Email Kampus <span className="text-rose-500">*</span>
          </label>
          <input
            id="reg-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@student.upnjatim.ac.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => markTouched("email")}
            disabled={loading}
            aria-invalid={Boolean(showEmailError)}
            className={inputClass(Boolean(showEmailError))}
          />
          <FieldErrorMessage message={showEmailError} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="reg-password"
              className="block text-[11px] font-medium text-slate-500"
            >
              Password <span className="text-rose-500">*</span>
            </label>
            <input
              id="reg-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => markTouched("password")}
              disabled={loading}
              aria-invalid={Boolean(showPasswordError)}
              className={inputClass(Boolean(showPasswordError))}
            />
            <FieldErrorMessage message={showPasswordError} />
          </div>

          <div>
            <label
              htmlFor="reg-confirm"
              className="block text-[11px] font-medium text-slate-500"
            >
              Konfirmasi Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-1">
              <input
                id="reg-confirm"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => markTouched("confirmPassword")}
                disabled={loading}
                aria-invalid={Boolean(showConfirmError)}
                className={`w-full border-0 border-b bg-transparent py-1.5 pr-8 pl-0 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none ${
                  showConfirmError
                    ? "border-rose-400 focus:border-rose-600"
                    : "border-slate-300 focus:border-slate-900"
                }`}
              />
              <PasswordEyeButton
                shown={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                ariaLabel={
                  showPassword
                    ? "Sembunyikan password dan konfirmasi"
                    : "Tampilkan password dan konfirmasi"
                }
              />
            </div>
            <FieldErrorMessage message={showConfirmError} />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
          >
            {error}
          </p>
        )}

        <div className="space-y-2.5 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#18191B] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#2a2c30] disabled:opacity-60"
          >
            {loading ? "Mendaftarkan Akun…" : "Daftar Akun"}
          </button>

          <Link
            href="/"
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#F3F4F6] px-5 text-sm font-medium text-slate-800 transition-colors hover:bg-[#E5E7EB]"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </form>
    </AuthSplitShell>
  );
}
