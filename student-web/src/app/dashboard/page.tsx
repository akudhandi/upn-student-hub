"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUser, type AuthUser } from "@/lib/auth";

type ModuleCard = {
  title: string;
  description: string;
  href: string;
  status: "Available" | "Placeholder";
};

const MODULES: ModuleCard[] = [
  {
    title: "Marketplace",
    description: "Browse and manage preloved listings from fellow students.",
    href: "/marketplace",
    status: "Placeholder",
  },
  {
    title: "Services",
    description: "Discover student services and offerings across campus.",
    href: "/services",
    status: "Placeholder",
  },
  {
    title: "Kost",
    description: "Find kost listings near campus with location details.",
    href: "/kost",
    status: "Placeholder",
  },
  {
    title: "Lost & Found",
    description: "Report or search for lost and found items.",
    href: "/lost-found",
    status: "Placeholder",
  },
];

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate user from localStorage on mount
    setUser(getUser());
  }, []);

  const displayName =
    (user?.profile && typeof user.profile === "object" && "name" in user.profile
      ? (user.profile as { name?: string }).name
      : null) || user?.name || null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Welcome section */}
      <section className="rounded-lg border border-gray-200 bg-white px-5 py-6 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          UPN Student Hub
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
          {displayName ? `Welcome, ${displayName}` : "Welcome to your dashboard"}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
          This is your central space to access campus marketplace, services, kost
          listings, and community updates. Use the navigation to explore each
          module as it becomes available.
        </p>
        {user?.email && (
          <p className="mt-3 text-sm text-gray-500">
            Signed in as <span className="font-medium text-gray-700">{user.email}</span>
          </p>
        )}
      </section>

      {/* Modules grid */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900">Modules</h3>
        <p className="mt-1 text-sm text-gray-500">
          Current MVP modules — placeholders are marked explicitly.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {MODULES.map((m) => (
            <div
              key={m.title}
              className="rounded-lg border border-gray-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-sm font-semibold text-gray-900">{m.title}</h4>
                <span
                  className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                    m.status === "Available"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {m.status}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-600">{m.description}</p>
              <div className="mt-4">
                {m.status === "Available" ? (
                  <Link
                    href={m.href}
                    className="text-sm font-medium text-gray-900 underline-offset-4 hover:underline"
                  >
                    Open {m.title}
                  </Link>
                ) : (
                  <span className="text-sm text-gray-400">Coming soon — under development</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Info / next steps */}
      <section className="rounded-lg border border-gray-200 bg-white px-5 py-5 sm:px-6">
        <h3 className="text-sm font-semibold text-gray-900">What&apos;s next</h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-gray-600">
          <li>Marketplace and Kost listings will appear here once modules are released.</li>
          <li>Your favorites, chat messages, and notifications will be accessible from this dashboard.</li>
          <li>No demo statistics are shown — data will reflect real backend content.</li>
        </ul>
      </section>
    </div>
  );
}
