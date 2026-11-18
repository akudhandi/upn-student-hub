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
    <div ref={containerRef} className="relative mt-1.5">
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
        className={`flex h-11 w-full items-center justify-between rounded-xl border px-3.5 text-left text-sm transition-colors focus:outline-none ${
          hasError
            ? "border-[#E06C6C] bg-[#FFF8F8] focus:border-[#C53939]"
            : open
              ? "border-[#141416] bg-white"
              : "border-[#E6E1DC] bg-[#F6F4F1] hover:border-[#D3CDC6]"
        }`}
      >
        <span className={value ? "truncate text-[#141416]" : "truncate text-[#A8A39E]"}>
          {value || "Pilih fakultas…"}
        </span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          className={`shrink-0 text-[#85817C] transition-transform ${
            open ? "rotate-180 text-[#141416]" : ""
          }`}
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby="reg-faculty-label"
          className="absolute left-0 right-0 z-30 mt-1.5 max-h-56 overflow-y-auto rounded-2xl border border-[#E5E0DA] bg-white p-1.5 shadow-[0_14px_34px_-12px_rgba(20,20,22,0.16)]"
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
                      ? "bg-[#141416] text-white"
                      : "text-[#3F3D3A] hover:bg-[#F4F1EE]"
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

  function inputBoxClass(
    hasErr: boolean,
    spacing = "mt-1.5 px-3.5"
  ): string {
    return `${spacing} h-11 w-full rounded-xl border text-sm text-[#141416] placeholder:text-[#A8A39E] transition-colors focus:outline-none ${
      hasErr
        ? "border-[#E06C6C] bg-[#FFF8F8] focus:border-[#C53939] focus:bg-white"
        : "border-[#E6E1DC] bg-[#F6F4F1] focus:border-[#141416] focus:bg-white"
    }`;
  }

  return (
    <AuthSplitShell
      activeTab="register"
      title="Buat Akun Mahasiswa"
      subtitle="Lengkapi identitas mahasiswa Anda untuk mulai menggunakan UPN Student Hub."
      footer={
        <>
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#141416] underline-offset-4 hover:underline"
          >
            Masuk di sini
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="reg-fullname"
              className="block text-xs font-medium text-[#57534E]"
            >
              Nama Lengkap <span className="text-[#C53939]">*</span>
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
              className={inputBoxClass(Boolean(showNameError))}
            />
            <FieldErrorMessage message={showNameError} />
          </div>

          <div>
            <label
              htmlFor="reg-npm"
              className="block text-xs font-medium text-[#57534E]"
            >
              NPM <span className="text-[#C53939]">*</span>
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
              className={inputBoxClass(Boolean(showNpmError))}
            />
            <FieldErrorMessage message={showNpmError} />
          </div>
        </div>

        <div>
          <span
            id="reg-faculty-label"
            className="block text-xs font-medium text-[#57534E]"
          >
            Fakultas <span className="text-[#C53939]">*</span>
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
            className="block text-xs font-medium text-[#57534E]"
          >
            Email Kampus <span className="text-[#C53939]">*</span>
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
            className={inputBoxClass(Boolean(showEmailError))}
          />
          <FieldErrorMessage message={showEmailError} />
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="reg-password"
              className="block text-xs font-medium text-[#57534E]"
            >
              Password <span className="text-[#C53939]">*</span>
            </label>
            <input
              id="reg-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => markTouched("password")}
              disabled={loading}
              aria-invalid={Boolean(showPasswordError)}
              className={inputBoxClass(Boolean(showPasswordError))}
            />
            <FieldErrorMessage message={showPasswordError} />
          </div>

          <div>
            <label
              htmlFor="reg-confirm"
              className="block text-xs font-medium text-[#57534E]"
            >
              Konfirmasi Password <span className="text-[#C53939]">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                id="reg-confirm"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => markTouched("confirmPassword")}
                disabled={loading}
                aria-invalid={Boolean(showConfirmError)}
                className={inputBoxClass(Boolean(showConfirmError), "pl-3.5 pr-10")}
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
            className="rounded-xl border border-[#F1C9C9] bg-[#FDF2F2] px-3.5 py-2.5 text-xs font-medium text-[#B83232]"
          >
            {error}
          </p>
        )}

        <div className="space-y-2.5 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#141416] px-5 text-sm font-medium text-white transition-colors hover:bg-[#27272A] disabled:opacity-60"
          >
            {loading ? "Mendaftarkan Akun…" : "Buat Akun Mahasiswa"}
          </button>

          <Link
            href="/"
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#EFECE8] px-5 text-sm font-medium text-[#27272A] transition-colors hover:bg-[#E5E1DC]"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </form>
    </AuthSplitShell>
  );
}
