"use client";

import { useEffect } from "react";

const SIZE_CLASSES: Record<"md" | "lg", string> = {
  md: "max-w-md",
  lg: "max-h-[90vh] max-w-lg overflow-y-auto",
};

export default function ModalShell({
  ariaLabel,
  onClose,
  busy = false,
  size = "lg",
  children,
}: {
  ariaLabel: string;
  onClose: () => void;
  busy?: boolean;
  size?: "md" | "lg";
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-lg ${SIZE_CLASSES[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
