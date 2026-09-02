"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Placeholder data — static array for UI preview.
// TODO: Replace with real API fetch (e.g. GET /api/v1/marketplace) when
// backend is connected. Keep the same shape so swap is trivial.
// ---------------------------------------------------------------------------
type MarketplaceItem = {
  id: string;
  title: string;
  price: number;
  category: string;
  description: string;
  seller: string;
  timeAgo: string;
  condition: string;
};

const PLACEHOLDER_ITEMS: MarketplaceItem[] = [
  {
    id: "1",
    title: "Texas Instruments TI-84 Plus CE",
    price: 1350000,
    category: "Electronics",
    description: "Lightly used for one semester. Comes with charging cable. Perfect for calculus.",
    seller: "Sarah J.",
    timeAgo: "2 days ago",
    condition: "Good",
  },
  {
    id: "2",
    title: "Calculus: Early Transcendentals, 9th Ed.",
    price: 720000,
    category: "Textbooks",
    description: "Good condition. Some highlighting in chapters 1–3. Binding is solid.",
    seller: "Mike T.",
    timeAgo: "5 hrs ago",
    condition: "Good",
  },
  {
    id: "3",
    title: "IKEA Office Chair – White",
    price: 480000,
    category: "Furniture",
    description: "Moving out sale. Chair is in great shape, very comfortable for long study sessions.",
    seller: "Emily R.",
    timeAgo: "1 day ago",
    condition: "Like New",
  },
  {
    id: "4",
    title: "Sony WH-1000XM4 Headphones",
    price: 2400000,
    category: "Electronics",
    description: "Upgraded to newer model. Works perfectly, battery life is still excellent.",
    seller: "David L.",
    timeAgo: "Just now",
    condition: "Good",
  },
  {
    id: "5",
    title: "Casio Scientific Calculator fx-991ID",
    price: 350000,
    category: "Electronics",
    description: "Barely used, includes manual and pouch. Ideal for engineering students.",
    seller: "Aulia P.",
    timeAgo: "3 days ago",
    condition: "Like New",
  },
  {
    id: "6",
    title: "Vintage Denim Jacket – Size M",
    price: 275000,
    category: "Fashion",
    description: "Classic fit, no defects. Washed and ready to wear. Great for campus layering.",
    seller: "Rina K.",
    timeAgo: "6 hrs ago",
    condition: "Good",
  },
];

const CATEGORIES = ["All", "Textbooks", "Electronics", "Furniture", "Fashion"] as const;

function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function ItemImagePlaceholder({ category }: { category: string }) {
  return (
    <div className="relative flex h-[172px] items-center justify-center bg-[#EEF2F7]">
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="text-slate-400"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M3 16L8.5 11L13 15.5L16 13L21 18" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span className="absolute top-3 right-3 rounded-md bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
        {category}
      </span>
    </div>
  );
}

function SellerAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
      {initials}
    </span>
  );
}

export default function MarketplacePage() {
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [priceFilter, setPriceFilter] = useState("any");
  const [conditionFilter, setConditionFilter] = useState("any");

  const filtered = PLACEHOLDER_ITEMS.filter((item) => {
    if (activeCategory !== "All" && item.category !== activeCategory) return false;
    if (conditionFilter !== "any" && item.condition !== conditionFilter) return false;
    if (priceFilter === "under500" && item.price >= 500000) return false;
    if (priceFilter === "500-1000" && (item.price < 500000 || item.price > 1000000)) return false;
    if (priceFilter === "over1000" && item.price <= 1000000) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Placeholder notice */}
      <p className="mb-3 text-[11px] leading-4 text-slate-400">
        Placeholder data — this grid uses a static array. Swap with{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">GET /api/v1/marketplace</code> when API is ready.
      </p>

      {/* Top row: Title Card (left) + Quick Filters (right) — aligned */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_260px] lg:items-start">
        {/* Title Card — must be bg-white border rounded-xl p-6 with thick accent top border */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 border-t-4 border-t-[#D4AF37]">
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900">Marketplace</h1>
          <p className="mt-1 text-sm text-slate-500">Buy and sell items within the UPN community.</p>

          {/* Category Pills — inside the Title Card */}
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={isActive}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002147] focus-visible:ring-offset-2 ${
                    isActive
                      ? "border-[#002147] bg-[#002147] text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {cat === "All" ? "All Items" : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Filters Card — aligned at top with Title Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-slate-500">
              <path d="M3 4.5H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M5 8H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M7 11.5H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="8" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1.1" />
              <circle cx="8" cy="8" r="1.2" stroke="currentColor" strokeWidth="1.1" />
            </svg>
            Quick Filters
          </h2>

          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="price-range" className="text-xs font-medium text-slate-700">
                Price Range
              </label>
              <select
                id="price-range"
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-[#F8F9FB] px-2.5 py-2 text-xs text-slate-700 focus:border-[#002147] focus:bg-white focus:outline-none"
              >
                <option value="any">Any Price</option>
                <option value="under500">Under Rp 500.000</option>
                <option value="500-1000">Rp 500.000 – 1.000.000</option>
                <option value="over1000">Over Rp 1.000.000</option>
              </select>
            </div>

            <div>
              <label htmlFor="condition" className="text-xs font-medium text-slate-700">
                Condition
              </label>
              <select
                id="condition"
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="mt-1 w-full rounded border border-slate-200 bg-[#F8F9FB] px-2.5 py-2 text-xs text-slate-700 focus:border-[#002147] focus:bg-white focus:outline-none"
              >
                <option value="any">Any Condition</option>
                <option value="Like New">Like New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Item Grid — below the top row */}
      <div className="mt-6">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-900">No items found</p>
            <p className="mt-1 text-xs text-slate-500">Try adjusting filters or check back later.</p>
            <button
              type="button"
              onClick={() => {
                setActiveCategory("All");
                setPriceFilter("any");
                setConditionFilter("any");
              }}
              className="mt-4 rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {filtered.map((item) => (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-slate-300 focus-within:ring-2 focus-within:ring-[#002147] focus-within:ring-offset-2"
              >
                <ItemImagePlaceholder category={item.category} />
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-900">
                    <a href="#" onClick={(e) => e.preventDefault()} className="hover:underline focus:outline-none">
                      {item.title}
                    </a>
                  </h3>
                  <p className="mt-1 text-[15px] font-bold text-[#D4AF37]">{formatRupiah(item.price)}</p>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-2">
                      <SellerAvatar name={item.seller} />
                      <span className="text-xs font-medium text-slate-700">{item.seller}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">{item.timeAgo}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
