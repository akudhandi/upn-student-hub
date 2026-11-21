"use client";

import { useState } from "react";
import ModalShell from "@/components/admin/ModalShell";
import { createAdminUser, type UserAccountType } from "@/lib/admin-api";
import { extractAdminError } from "@/lib/api";
import { ACCOUNT_TYPE_OPTIONS } from "./user-meta";

export default function CreateOfficialAccountDialog({
  onCreated,
  onClose,
}: {
  onCreated: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<UserAccountType>("ormawa");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [faculty, setFaculty] = useState("");
  const [bio, setBio] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || password.length < 8) {
      setError(
        "Lengkapi nama akun, email valid, dan password minimal 8 karakter.",
      );
      return;
    }

    setSaving(true);
    try {
      await createAdminUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        account_type: accountType,
        faculty: faculty.trim() || undefined,
        bio: bio.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(extractAdminError(err, "Gagal membuat akun baru."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      ariaLabel="Buat akun resmi HIMA, Ormawa, atau Fakultas"
      onClose={onClose}
      busy={saving}
    >
      <h3 className="font-display text-lg font-semibold text-[#141416]">
        Buat Akun Resmi Portal Mahasiswa
      </h3>
      <p className="mt-1 text-xs text-[#6E6A66]">
        Akun HIMA, Ormawa, atau Fakultas dapat langsung login di Portal Mahasiswa
        menggunakan email &amp; password ini untuk mengajukan event
        terverifikasi.
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="org-type"
              className="block text-xs font-semibold text-[#57534E]"
            >
              Tipe Akun
            </label>
            <select
              id="org-type"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as UserAccountType)}
              disabled={saving}
              className="mt-1 w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3 py-2 text-sm text-[#141416] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10 focus:outline-none"
            >
              {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="org-faculty"
              className="block text-xs font-semibold text-[#57534E]"
            >
              Fakultas / Lingkup
            </label>
            <input
              id="org-faculty"
              type="text"
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              disabled={saving}
              placeholder="Mis. Fakultas Ilmu Komputer"
              className="mt-1 w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3 py-2 text-sm text-[#141416] placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="org-name"
            className="block text-xs font-semibold text-[#57534E]"
          >
            Nama Organisasi / Fakultas / Akun *
          </label>
          <input
            id="org-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            placeholder="Mis. HIMA Informatika UPN"
            className="mt-1 w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3 py-2 text-sm text-[#141416] placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="org-email"
              className="block text-xs font-semibold text-[#57534E]"
            >
              Email Login *
            </label>
            <input
              id="org-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={saving}
              placeholder="himatif@upnjatim.ac.id"
              className="mt-1 w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3 py-2 text-sm text-[#141416] placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="org-password"
              className="block text-xs font-semibold text-[#57534E]"
            >
              Password Awal *
            </label>
            <div className="relative mt-1">
              <input
                id="org-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={saving}
                placeholder="Minimal 8 karakter"
                className="w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3 py-2 pr-16 text-sm text-[#141416] placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={saving}
                aria-label={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
                className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-[#6E6A66] transition hover:text-[#141416] disabled:opacity-50"
              >
                {showPassword ? "Sembunyi" : "Tampil"}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="org-bio"
            className="block text-xs font-semibold text-[#57534E]"
          >
            Deskripsi Singkat (Opsional)
          </label>
          <textarea
            id="org-bio"
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={saving}
            placeholder="Akun resmi penyelenggara kegiatan…"
            className="mt-1 w-full rounded-xl border border-[#E5E0DA] bg-[#FAF8F6] px-3 py-2 text-sm text-[#141416] placeholder:text-[#8C8782] focus:border-[#141416] focus:bg-white focus:ring-2 focus:ring-[#141416]/10 focus:outline-none"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-[#F3C6C6] bg-[#FDECEC] px-3 py-2 text-xs font-medium text-[#A62D2D]"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-[#DFD9D2] bg-white px-4 py-2 text-xs font-semibold text-[#141416] transition hover:border-[#CFC8BF] hover:bg-[#FAF8F6] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-[#141416] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#242428] disabled:opacity-60"
          >
            {saving ? "Menyimpan…" : "Buat Akun"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
