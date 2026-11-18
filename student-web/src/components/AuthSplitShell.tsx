"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LoginFormPanel, RegisterFormPanel } from "@/components/AuthForms";

const HUB_PILLARS = [
  {
    label: "Marketplace",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 8h12l-1 11H7L6 8z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 8V6.5a2.5 2.5 0 015 0V8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "Layanan",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3l2.2 5.3L19.5 10l-5.3 1.8L12 17l-2.2-5.2L4.5 10l5.3-1.7L12 3z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Temuan",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M15.5 15.5L20 20"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "Agenda",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="4"
          y="5.5"
          width="16"
          height="14.5"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M8 3.5v3M16 3.5v3M4 10h16"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

export function AuthWorkspace({
  initialTab,
}: {
  initialTab: "login" | "register";
}) {
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [stageHeight, setStageHeight] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const activeTabRef = useRef(activeTab);
  const loginRef = useRef<HTMLDivElement>(null);
  const registerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const animateSwitch = useCallback(
    (nextTab: "login" | "register", pushUrl: boolean) => {
      const currentTab = activeTabRef.current;
      if (nextTab === currentTab) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const currentEl =
        currentTab === "login" ? loginRef.current : registerRef.current;
      const targetEl =
        nextTab === "login" ? loginRef.current : registerRef.current;

      const startHeight = currentEl?.offsetHeight ?? null;
      const endHeight = targetEl?.offsetHeight ?? null;
      const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (pushUrl && typeof window !== "undefined") {
        window.history.pushState(
          null,
          "",
          nextTab === "register" ? "/register" : "/login"
        );
      }

      if (startHeight && endHeight && !reducedMotion) {
        setStageHeight(startHeight);
        setIsTransitioning(true);
        activeTabRef.current = nextTab;
        setActiveTab(nextTab);

        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = requestAnimationFrame(() => {
            setStageHeight(endHeight);
          });
        });

        timerRef.current = setTimeout(() => {
          setIsTransitioning(false);
          setStageHeight(null);
        }, 400);
      } else {
        activeTabRef.current = nextTab;
        setActiveTab(nextTab);
        setIsTransitioning(false);
        setStageHeight(null);
      }
    },
    []
  );

  useEffect(() => {
    function handlePopState() {
      const pathTab =
        window.location.pathname === "/register" ? "register" : "login";
      animateSwitch(pathTab, false);
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animateSwitch]);

  function handleTabAnchorClick(
    targetTab: "login" | "register",
    event: React.MouseEvent<HTMLAnchorElement>
  ) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    animateSwitch(targetTab, true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#DFDBD7] px-3 py-5 text-[#141416] sm:px-6 sm:py-8">
      <div className="auth-shell-enter w-full max-w-[1040px] rounded-[28px] border border-[#E7E2DD] bg-[#F4F1EE] p-4 shadow-[0_24px_60px_-28px_rgba(20,20,22,0.18)] sm:p-6 lg:p-7">
        {/* Top Bar (stays mounted with zero reload) */}
        <header className="flex flex-wrap items-center justify-between gap-3 pb-5">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight text-[#141416] transition-opacity hover:opacity-85"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#141416] text-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 1.5L9.8 6.2L14.5 8L9.8 9.8L8 14.5L6.2 9.8L1.5 8L6.2 6.2L8 1.5Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span>UPN Student Hub</span>
          </Link>

          <div className="flex items-center gap-2">
            <nav
              aria-label="Navigasi autentikasi"
              className="relative inline-grid grid-cols-2 items-center rounded-full bg-[#EAE6E2] p-1"
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-[0_2px_10px_-2px_rgba(20,20,22,0.12)] transition-transform duration-380 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  activeTab === "register" ? "translate-x-full" : "translate-x-0"
                }`}
              />
              <a
                href="/login"
                onClick={(e) => handleTabAnchorClick("login", e)}
                aria-current={activeTab === "login" ? "page" : undefined}
                className={`relative z-10 min-w-[76px] rounded-full px-4 py-1.5 text-center text-xs font-medium transition-colors duration-300 ${
                  activeTab === "login"
                    ? "text-[#141416]"
                    : "text-[#6E6A66] hover:text-[#141416]"
                }`}
              >
                Masuk
              </a>
              <a
                href="/register"
                onClick={(e) => handleTabAnchorClick("register", e)}
                aria-current={activeTab === "register" ? "page" : undefined}
                className={`relative z-10 min-w-[76px] rounded-full px-4 py-1.5 text-center text-xs font-medium transition-colors duration-300 ${
                  activeTab === "register"
                    ? "text-[#141416]"
                    : "text-[#6E6A66] hover:text-[#141416]"
                }`}
              >
                Daftar
              </a>
            </nav>

            <Link
              href="/"
              className="hidden rounded-full border border-[#E2DDD7] bg-white px-3.5 py-1.5 text-xs font-medium text-[#3F3D3A] transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[#FAF8F6] hover:shadow-xs sm:inline-flex"
            >
              Beranda
            </Link>
          </div>
        </header>

        {/* Main Workspace Split */}
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          {/* Left Calm Editorial Showcase */}
          <aside className="hidden flex-col justify-between rounded-[22px] bg-[#ECE8E4] p-8 lg:flex">
            <div className="space-y-3">
              <p className="text-xs font-medium text-[#787470]">
                UPN &ldquo;Veteran&rdquo; Jawa Timur
              </p>
              <h2 className="text-[26px] font-semibold leading-[1.24] tracking-tight text-[#141416]">
                Semua aktivitas kampus dalam satu ruang yang rapi.
              </h2>
              <p className="max-w-[330px] text-[13px] leading-relaxed text-[#6E6A66]">
                Ruang khusus mahasiswa untuk jual beli, layanan sebaya, dan info acara kampus.
              </p>
            </div>

            <div className="my-auto py-8">
              <div className="grid grid-cols-2 gap-3.5">
                {HUB_PILLARS.map((item) => (
                  <div
                    key={item.label}
                    className="group flex flex-col items-start justify-between rounded-2xl border border-[#E5E0DA] bg-white p-4 shadow-[0_8px_20px_-14px_rgba(20,20,22,0.12)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[#D5CEC6] hover:shadow-[0_14px_28px_-14px_rgba(20,20,22,0.18)]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F4F1EE] text-[#141416] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:bg-[#141416] group-hover:text-white">
                      {item.icon}
                    </span>
                    <span className="mt-5 text-xs font-medium text-[#141416]">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-[#DFDAD4] pt-4 text-xs text-[#6E6A66]">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="shrink-0 text-[#141416]"
              >
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M8.5 12.2l2.3 2.3 4.7-4.8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Khusus email mahasiswa @student.upnjatim.ac.id</span>
            </div>
          </aside>

          {/* Right Form Card with Zero-Reload Cross-Slide & Smooth Height */}
          <section className="flex flex-col justify-center rounded-[22px] border border-[#E7E2DD] bg-white px-5 py-6 sm:px-9 sm:py-8">
            <div
              style={stageHeight !== null ? { height: `${stageHeight}px` } : undefined}
              className={`relative mx-auto w-full max-w-[420px] transition-[height] duration-380 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isTransitioning ? "overflow-hidden" : "overflow-visible"
              }`}
            >
              <div
                ref={loginRef}
                aria-hidden={activeTab !== "login"}
                className={`w-full transition-[transform,opacity,visibility] duration-380 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  activeTab === "login"
                    ? "visible relative z-10 translate-x-0 opacity-100"
                    : "invisible pointer-events-none absolute inset-x-0 top-0 z-0 -translate-x-7 opacity-0"
                }`}
              >
                <LoginFormPanel
                  onSwitchToRegister={() => animateSwitch("register", true)}
                />
              </div>

              <div
                ref={registerRef}
                aria-hidden={activeTab !== "register"}
                className={`w-full transition-[transform,opacity,visibility] duration-380 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  activeTab === "register"
                    ? "visible relative z-10 translate-x-0 opacity-100"
                    : "invisible pointer-events-none absolute inset-x-0 top-0 z-0 translate-x-7 opacity-0"
                }`}
              >
                <RegisterFormPanel
                  onSwitchToLogin={() => animateSwitch("login", true)}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
