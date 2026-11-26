"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  forgotPassword,
  login,
  register,
  resendOtp,
  resetPassword,
  verifyOtp,
  type ApiError,
} from "@/lib/api";
import { setAuth } from "@/lib/auth";
import { UPN_FACULTIES } from "@/lib/constants";

const FAKULTAS_OPTIONS = UPN_FACULTIES;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALPHA_SPACE_RE = /^[A-Za-z\s.',-]+$/;
const NPM_RE = /^\d{11}$/;

type LoginField = "email" | "password";
type RegisterField =
  | "fullName"
  | "npm"
  | "faculty"
  | "email"
  | "password"
  | "confirmPassword";

function authInputClass(
  hasErr: boolean,
  spacing = "mt-1.5 px-3.5"
): string {
  return `${spacing} h-11 w-full rounded-xl border text-sm text-[#141416] placeholder:text-[#A8A39E] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none ${
    hasErr
      ? "border-[#E06C6C] bg-[#FFF8F8] focus:border-[#C53939] focus:bg-white focus:shadow-[0_0_0_3px_rgba(197,57,57,0.1)]"
      : "border-[#E6E1DC] bg-[#F6F4F1] hover:border-[#D7D0C8] focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]"
  }`;
}

function PasswordEyeButton({
  shown,
  onToggle,
  ariaLabel,
}: {
  shown: boolean;
  onToggle: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel ?? (shown ? "Sembunyikan password" : "Tampilkan password")}
      title={ariaLabel ?? (shown ? "Sembunyikan password" : "Tampilkan password")}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[#85817C] transition-all duration-200 ease-out hover:bg-[#EAE6E2] hover:text-[#141416] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141416]"
    >
      {shown ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 4.24A10.94 10.94 0 0112 4c5.5 0 9.5 4.2 10.7 8-.5 1.56-1.45 3.1-2.74 4.37M6.61 6.61C4.55 8 3.06 10.02 2.3 12c1.2 3.8 5.2 8 9.7 8 1.58 0 3.07-.37 4.4-1.02"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M2.3 12C3.5 8.2 7.5 4 12 4s8.5 4.2 9.7 8c-1.2 3.8-5.2 8-9.7 8s-8.5-4.2-9.7-8z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      )}
    </button>
  );
}

function FieldErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="auth-error-enter mt-1.5 text-[11px] leading-4 font-medium text-[#C53939]"
    >
      {message}
    </p>
  );
}

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
        className={`flex h-11 w-full items-center justify-between rounded-xl border px-3.5 text-left text-sm transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none ${
          hasError
            ? "border-[#E06C6C] bg-[#FFF8F8] focus:border-[#C53939] focus:shadow-[0_0_0_3px_rgba(197,57,57,0.1)]"
            : open
              ? "border-[#141416] bg-white shadow-[0_0_0_3px_rgba(20,20,22,0.06)]"
              : "border-[#E6E1DC] bg-[#F6F4F1] hover:border-[#D3CDC6] focus:border-[#141416] focus:bg-white focus:shadow-[0_0_0_3px_rgba(20,20,22,0.06)]"
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
          className={`shrink-0 text-[#85817C] transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${
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
          className="auth-dropdown-enter absolute left-0 right-0 z-30 mt-1.5 max-h-56 overflow-y-auto rounded-2xl border border-[#E5E0DA] bg-white p-1.5 shadow-[0_14px_34px_-12px_rgba(20,20,22,0.16)]"
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

function OtpVerifyPanel({
  email,
  initialCooldown,
  notice,
  backLabel,
  onBack,
}: {
  email: string;
  initialCooldown: number;
  notice?: string | null;
  backLabel: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(initialCooldown);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(notice ?? null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("Masukkan kode OTP 6 digit angka.");
      return;
    }

    setVerifying(true);
    try {
      const res = await verifyOtp({ email, code });
      setAuth(res.token, res.user);
      router.push("/dashboard");
    } catch (err) {
      const apiError = err as ApiError;
      const firstFieldError = apiError.errors
        ? Object.values(apiError.errors).flat()[0]
        : null;
      setError(
        firstFieldError || apiError.message || "Kode OTP tidak valid atau sudah kedaluwarsa."
      );
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resending || cooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      const res = await resendOtp({ email, type: "register" });
      setStatusNotice(res.message);
      setCooldown(res.retry_after ?? 60);
    } catch (err) {
      const apiError = err as ApiError;
      const retryAfter = (apiError.data as { retry_after?: number } | undefined)?.retry_after;
      if (typeof retryAfter === "number" && retryAfter > 0) {
        setCooldown(retryAfter);
      }
      setError(apiError.message || "Gagal mengirim ulang kode OTP.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="px-0.5 py-0.5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#141416] sm:text-[26px]">
          Verifikasi Email Kampus
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-[#787470]">
          Masukkan kode OTP 6 digit yang telah kami kirim ke{" "}
          <span className="font-semibold text-[#141416]">{email}</span>.
        </p>
      </div>

      {statusNotice && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-[#CBE5D5] bg-[#E4F2EA] px-3.5 py-2.5 text-xs font-medium text-[#1E603E]"
        >
          {statusNotice}
        </p>
      )}

      <form className="mt-5 space-y-4" onSubmit={handleVerify} noValidate>
        <div>
          <label
            htmlFor="otp-verify-code"
            className="block text-xs font-medium text-[#57534E]"
          >
            Kode OTP 6 Digit <span className="text-[#C53939]">*</span>
          </label>
          <input
            id="otp-verify-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            disabled={verifying}
            className={`${authInputClass(Boolean(error))} text-center font-mono text-base tracking-[0.35em]`}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="auth-error-enter rounded-xl border border-[#F1C9C9] bg-[#FDF2F2] px-3.5 py-2.5 text-xs font-medium text-[#B83232]"
          >
            {error}
          </p>
        )}

        <div className="space-y-2.5 pt-1">
          <button
            type="submit"
            disabled={verifying || code.length !== 6}
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#141416] px-5 text-sm font-medium text-white transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#242428] disabled:pointer-events-none disabled:opacity-60"
          >
            {verifying ? "Memverifikasi…" : "Verifikasi & Masuk"}
          </button>

          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={resending || cooldown > 0}
            className="flex h-11 w-full items-center justify-center rounded-full border border-[#DFD9D2] bg-white px-5 text-xs font-semibold text-[#141416] transition-colors hover:bg-[#FAF8F6] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {resending
              ? "Mengirim ulang…"
              : cooldown > 0
                ? `Kirim ulang kode OTP (${cooldown}d)`
                : "Kirim ulang kode OTP"}
          </button>

          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-full items-center justify-center rounded-full bg-[#EFECE8] px-5 text-xs font-medium text-[#27272A] transition-colors hover:bg-[#E5E1DC]"
          >
            {backLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export function LoginFormPanel({
  onSwitchToRegister,
}: {
  onSwitchToRegister: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<LoginField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingVerify, setPendingVerify] = useState<{
    email: string;
    message: string;
  } | null>(null);

  function markTouched(field: LoginField) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  const emailError = useMemo(() => {
    const trimmed = email.trim();
    if (!trimmed) return "Email kampus wajib diisi.";
    if (!EMAIL_RE.test(trimmed)) {
      return "Format email tidak valid (contoh: nama@student.upnjatim.ac.id).";
    }
    return null;
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return "Password wajib diisi.";
    return null;
  }, [password]);

  const showEmailError = touched.email || submitAttempted ? emailError : null;
  const showPasswordError =
    touched.password || submitAttempted ? passwordError : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitAttempted(true);

    if (emailError || passwordError) {
      return;
    }

    setLoading(true);
    try {
      const res = await login({ email: email.trim(), password });
      if (res.token && res.user) {
        setAuth(res.token, res.user);
      }
      router.push("/dashboard");
    } catch (err) {
      const apiError = err as ApiError;
      const errData = apiError.data as
        | { requires_verification?: boolean; email?: string }
        | undefined;
      if (apiError.status === 403 && errData?.requires_verification) {
        setPendingVerify({
          email: errData.email || email.trim().toLowerCase(),
          message: apiError.message,
        });
        return;
      }
      if (apiError.errors) {
        const firstFieldError = Object.values(apiError.errors).flat()[0];
        setError(firstFieldError || apiError.message);
      } else {
        setError(apiError.message || "Terjadi kesalahan saat masuk. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (pendingVerify) {
    return (
      <OtpVerifyPanel
        email={pendingVerify.email}
        initialCooldown={0}
        notice={pendingVerify.message}
        backLabel="Kembali ke form masuk"
        onBack={() => setPendingVerify(null)}
      />
    );
  }

  return (
    <div className="px-0.5 py-0.5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#141416] sm:text-[26px]">
          Selamat Datang Kembali
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-[#787470]">
          Masukkan email kampus dan password untuk mengakses workspace mahasiswa Anda.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-medium text-[#57534E]"
          >
            Email Kampus <span className="text-[#C53939]">*</span>
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@student.upnjatim.ac.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => markTouched("email")}
            disabled={loading}
            aria-invalid={Boolean(showEmailError)}
            className={authInputClass(Boolean(showEmailError))}
          />
          <FieldErrorMessage message={showEmailError} />
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-[#57534E]"
            >
              Password <span className="text-[#C53939]">*</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-[#57534E] underline-offset-4 transition-colors hover:text-[#141416] hover:underline"
            >
              Lupa password?
            </Link>
          </div>
          <div className="relative mt-1.5">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Masukkan password Anda"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => markTouched("password")}
              disabled={loading}
              aria-invalid={Boolean(showPasswordError)}
              className={authInputClass(Boolean(showPasswordError), "pl-3.5 pr-10")}
            />
            <PasswordEyeButton
              shown={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
            />
          </div>
          <FieldErrorMessage message={showPasswordError} />
        </div>

        {error && (
          <p
            role="alert"
            className="auth-error-enter rounded-xl border border-[#F1C9C9] bg-[#FDF2F2] px-3.5 py-2.5 text-xs font-medium text-[#B83232]"
          >
            {error}
          </p>
        )}

        <div className="space-y-2.5 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#141416] px-5 text-sm font-medium text-white transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#242428] hover:shadow-[0_10px_22px_-10px_rgba(20,20,22,0.38)] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? "Memproses…" : "Masuk ke Portal"}
          </button>

          <Link
            href="/"
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#EFECE8] px-5 text-sm font-medium text-[#27272A] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#E5E1DC] active:translate-y-0 active:scale-[0.99]"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </form>

      <div className="mt-6 border-t border-[#F1EDE9] pt-5 text-center text-xs text-[#787470]">
        Belum punya akun?{" "}
        <a
          href="/register"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
              return;
            }
            e.preventDefault();
            onSwitchToRegister();
          }}
          className="font-semibold text-[#141416] underline-offset-4 hover:underline"
        >
          Daftar sekarang
        </a>
      </div>
    </div>
  );
}

export function RegisterFormPanel({
  onSwitchToLogin,
}: {
  onSwitchToLogin: () => void;
}) {
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
  const [pendingVerify, setPendingVerify] = useState<{
    email: string;
    message: string;
  } | null>(null);

  function markTouched(field: RegisterField) {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }

  const nameError = useMemo(() => {
    const trimmed = fullName.trim();
    if (!trimmed) return "Nama lengkap wajib diisi.";
    if (!ALPHA_SPACE_RE.test(trimmed)) {
      return "Nama lengkap hanya boleh berisi huruf, spasi, titik, koma, tanda petik, atau tanda hubung.";
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
        router.push("/dashboard");
        return;
      }
      setPendingVerify({
        email: res.email || email.trim().toLowerCase(),
        message: res.message,
      });
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

  if (pendingVerify) {
    return (
      <OtpVerifyPanel
        email={pendingVerify.email}
        initialCooldown={60}
        notice={pendingVerify.message}
        backLabel="Kembali ke form pendaftaran"
        onBack={() => setPendingVerify(null)}
      />
    );
  }

  return (
    <div className="px-0.5 py-0.5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#141416] sm:text-[26px]">
          Buat Akun Mahasiswa
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-[#787470]">
          Lengkapi identitas mahasiswa Anda untuk mulai menggunakan UPN Student Hub.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
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
                setFullName(e.target.value.replace(/[^a-zA-Z\s.',-]/g, ""))
              }
              onBlur={() => markTouched("fullName")}
              disabled={loading}
              aria-invalid={Boolean(showNameError)}
              className={authInputClass(Boolean(showNameError))}
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
              className={authInputClass(Boolean(showNpmError))}
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
            className={authInputClass(Boolean(showEmailError))}
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
              className={authInputClass(Boolean(showPasswordError))}
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
                className={authInputClass(Boolean(showConfirmError), "pl-3.5 pr-10")}
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
            className="auth-error-enter rounded-xl border border-[#F1C9C9] bg-[#FDF2F2] px-3.5 py-2.5 text-xs font-medium text-[#B83232]"
          >
            {error}
          </p>
        )}

        <div className="space-y-2.5 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#141416] px-5 text-sm font-medium text-white transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#242428] hover:shadow-[0_10px_22px_-10px_rgba(20,20,22,0.38)] active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? "Mendaftarkan Akun…" : "Buat Akun Mahasiswa"}
          </button>

          <Link
            href="/"
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#EFECE8] px-5 text-sm font-medium text-[#27272A] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#E5E1DC] active:translate-y-0 active:scale-[0.99]"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </form>

      <div className="mt-6 border-t border-[#F1EDE9] pt-5 text-center text-xs text-[#787470]">
        Sudah punya akun?{" "}
        <a
          href="/login"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
              return;
            }
            e.preventDefault();
            onSwitchToLogin();
          }}
          className="font-semibold text-[#141416] underline-offset-4 hover:underline"
        >
          Masuk di sini
        </a>
      </div>
    </div>
  );
}

export function ForgotPasswordFormPanel() {
  const [step, setStep] = useState<"request" | "reset" | "done">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const trimmedEmail = email.trim().toLowerCase();

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!trimmedEmail || !EMAIL_RE.test(trimmedEmail)) {
      setError("Masukkan alamat email kampus yang valid.");
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword({ email: trimmedEmail });
      setNotice(res.message);
      setCooldown(res.retry_after ?? 60);
      setStep("reset");
    } catch (err) {
      const apiError = err as ApiError;
      const retryAfter = (apiError.data as { retry_after?: number } | undefined)?.retry_after;
      if (typeof retryAfter === "number" && retryAfter > 0) {
        setCooldown(retryAfter);
      }
      setError(apiError.message || "Gagal mengirim kode OTP reset password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendResetOtp() {
    if (resending || cooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      const res = await resendOtp({ email: trimmedEmail, type: "password_reset" });
      setNotice(res.message);
      setCooldown(res.retry_after ?? 60);
    } catch (err) {
      const apiError = err as ApiError;
      const retryAfter = (apiError.data as { retry_after?: number } | undefined)?.retry_after;
      if (typeof retryAfter === "number" && retryAfter > 0) {
        setCooldown(retryAfter);
      }
      setError(apiError.message || "Gagal mengirim ulang kode OTP.");
    } finally {
      setResending(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("Kode OTP harus 6 digit angka.");
      return;
    }
    if (password.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({
        email: trimmedEmail,
        code,
        password,
        password_confirmation: confirmPassword,
      });
      setNotice(res.message);
      setStep("done");
    } catch (err) {
      const apiError = err as ApiError;
      const firstFieldError = apiError.errors
        ? Object.values(apiError.errors).flat()[0]
        : null;
      setError(firstFieldError || apiError.message || "Gagal memperbarui password.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#141416] sm:text-[26px]">
            Password Berhasil Diperbarui
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#787470]">
            Akun Anda sudah diamankan. Seluruh sesi aktif sebelumnya telah dicabut.
          </p>
        </div>

        <p
          role="status"
          className="rounded-xl border border-[#CBE5D5] bg-[#E4F2EA] px-3.5 py-3 text-xs font-medium text-[#1E603E]"
        >
          {notice || "Password berhasil diperbarui. Silakan masuk dengan password baru Anda."}
        </p>

        <Link
          href="/login"
          className="flex h-11 w-full items-center justify-center rounded-full bg-[#141416] px-5 text-sm font-medium text-white transition-colors hover:bg-[#242428]"
        >
          Masuk dengan Password Baru
        </Link>
      </div>
    );
  }

  if (step === "reset") {
    return (
      <div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#141416] sm:text-[26px]">
            Atur Ulang Password
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-[#787470]">
            Masukkan kode OTP 6 digit yang dikirim ke{" "}
            <span className="font-semibold text-[#141416]">{trimmedEmail}</span> dan buat password baru.
          </p>
        </div>

        {notice && (
          <p
            role="status"
            className="mt-4 rounded-xl border border-[#CBE5D5] bg-[#E4F2EA] px-3.5 py-2.5 text-xs font-medium text-[#1E603E]"
          >
            {notice}
          </p>
        )}

        <form className="mt-5 space-y-4" onSubmit={handleResetSubmit} noValidate>
          <div>
            <label
              htmlFor="reset-otp-code"
              className="block text-xs font-medium text-[#57534E]"
            >
              Kode OTP 6 Digit <span className="text-[#C53939]">*</span>
            </label>
            <input
              id="reset-otp-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={loading}
              className={`${authInputClass(false)} text-center font-mono text-base tracking-[0.35em]`}
            />
          </div>

          <div>
            <label
              htmlFor="reset-new-password"
              className="block text-xs font-medium text-[#57534E]"
            >
              Password Baru <span className="text-[#C53939]">*</span>
            </label>
            <div className="relative mt-1.5">
              <input
                id="reset-new-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className={authInputClass(false, "pl-3.5 pr-10")}
              />
              <PasswordEyeButton
                shown={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reset-confirm-password"
              className="block text-xs font-medium text-[#57534E]"
            >
              Konfirmasi Password Baru <span className="text-[#C53939]">*</span>
            </label>
            <input
              id="reset-confirm-password"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className={authInputClass(false)}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="auth-error-enter rounded-xl border border-[#F1C9C9] bg-[#FDF2F2] px-3.5 py-2.5 text-xs font-medium text-[#B83232]"
            >
              {error}
            </p>
          )}

          <div className="space-y-2.5 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center rounded-full bg-[#141416] px-5 text-sm font-medium text-white transition-colors hover:bg-[#242428] disabled:pointer-events-none disabled:opacity-60"
            >
              {loading ? "Menyimpan…" : "Simpan Password Baru"}
            </button>

            <button
              type="button"
              onClick={() => void handleResendResetOtp()}
              disabled={resending || cooldown > 0}
              className="flex h-11 w-full items-center justify-center rounded-full border border-[#DFD9D2] bg-white px-5 text-xs font-semibold text-[#141416] transition-colors hover:bg-[#FAF8F6] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {resending
                ? "Mengirim ulang…"
                : cooldown > 0
                  ? `Kirim ulang OTP (${cooldown}d)`
                  : "Kirim ulang OTP"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("request");
                setError(null);
              }}
              className="flex h-10 w-full items-center justify-center rounded-full bg-[#EFECE8] px-5 text-xs font-medium text-[#27272A] transition-colors hover:bg-[#E5E1DC]"
            >
              Ganti email
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#141416] sm:text-[26px]">
          Lupa Password
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-[#787470]">
          Masukkan email kampus Anda untuk menerima kode OTP pemulihan password.
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleRequestOtp} noValidate>
        <div>
          <label
            htmlFor="forgot-email"
            className="block text-xs font-medium text-[#57534E]"
          >
            Email Kampus <span className="text-[#C53939]">*</span>
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@student.upnjatim.ac.id"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className={authInputClass(Boolean(error))}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="auth-error-enter rounded-xl border border-[#F1C9C9] bg-[#FDF2F2] px-3.5 py-2.5 text-xs font-medium text-[#B83232]"
          >
            {error}
          </p>
        )}

        <div className="space-y-2.5 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#141416] px-5 text-sm font-medium text-white transition-colors hover:bg-[#242428] disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? "Mengirim kode OTP…" : "Kirim Kode OTP"}
          </button>

          <Link
            href="/login"
            className="flex h-11 w-full items-center justify-center rounded-full bg-[#EFECE8] px-5 text-sm font-medium text-[#27272A] transition-colors hover:bg-[#E5E1DC]"
          >
            Kembali ke Halaman Masuk
          </Link>
        </div>
      </form>
    </div>
  );
}
