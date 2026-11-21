import type { BadgeTone } from "@/components/admin/StatusBadge";
import type { UserAccountType, UserStatus } from "@/lib/admin-api";

export const ACCOUNT_TYPE_OPTIONS: { value: UserAccountType; label: string }[] = [
  { value: "ormawa", label: "Ormawa (BEM / UKM)" },
  { value: "hima", label: "HIMA (Himpunan)" },
  { value: "faculty", label: "Fakultas / Institusi" },
  { value: "student", label: "Mahasiswa Reguler" },
];

export function accountTypeMeta(type?: string): {
  label: string;
  isOfficial: boolean;
  pillClass: string;
} {
  switch (type) {
    case "ormawa":
      return {
        label: "Ormawa",
        isOfficial: true,
        pillClass: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
      };
    case "hima":
      return {
        label: "HIMA",
        isOfficial: true,
        pillClass:
          "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200",
      };
    case "faculty":
      return {
        label: "Fakultas",
        isOfficial: true,
        pillClass:
          "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
      };
    default:
      return {
        label: "Mahasiswa",
        isOfficial: false,
        pillClass: "bg-slate-100 text-slate-600",
      };
  }
}

export function statusMeta(status: string): {
  label: string;
  tone: BadgeTone;
} {
  switch (status) {
    case "active":
      return { label: "Aktif", tone: "green" };
    case "suspended":
      return { label: "Suspended", tone: "amber" };
    case "banned":
      return { label: "Banned", tone: "rose" };
    case "inactive":
      return { label: "Nonaktif", tone: "slate" };
    default:
      return { label: status, tone: "slate" };
  }
}

export const ACTION_COPY: Record<
  Exclude<UserStatus, "inactive">,
  { title: string; message: string; confirm: string; danger: boolean }
> = {
  active: {
    title: "Aktifkan kembali pengguna?",
    message:
      "Pengguna dapat kembali mengakses dan berinteraksi di portal mahasiswa.",
    confirm: "Aktifkan",
    danger: false,
  },
  suspended: {
    title: "Suspend akun pengguna?",
    message: "Akses interaksi pengguna akan ditangguhkan sementara.",
    confirm: "Suspend",
    danger: false,
  },
  banned: {
    title: "Ban akun pengguna?",
    message: "Pengguna akan diblokir dan tidak dapat login ke portal mahasiswa.",
    confirm: "Ban Pengguna",
    danger: true,
  },
};

export function VerifiedCheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      aria-label="Akun resmi terverifikasi"
      className="inline-block shrink-0 text-sky-600"
    >
      <circle cx="10" cy="10" r="9" fill="currentColor" />
      <path
        d="M6.4 10.3L8.8 12.7L13.8 7.5"
        stroke="white"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
