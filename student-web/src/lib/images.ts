// ---------------------------------------------------------------------------
// Catalog image resolution with curated fallbacks.
//
// Backend listing payloads expose an optional `images` relation whose
// `file_path` values are relative storage paths (local disk for MVP). When a
// listing has no usable photo, resolve a deterministic, high-quality
// Unsplash placeholder matched to the module (and category hint when
// available) so catalog cards, detail heroes, and admin thumbnails never
// render broken or empty.
// ---------------------------------------------------------------------------

export type ImageModule = "marketplace" | "kost" | "service" | "lostfound" | "event";

export type ApiImage = {
  file_path?: string | null;
  url?: string | null;
};

const UNSPLASH = "https://images.unsplash.com";

function u(id: string): string {
  return `${UNSPLASH}/photo-${id}?auto=format&fit=crop&w=800&q=60`;
}

// Curated, stable Unsplash photo IDs per module/category.
const POOLS: Record<string, string[]> = {
  "marketplace:elektronik": [u("1496181133206-80ce9b88a853"), u("1583394838336-acd977736f90")],
  "marketplace:buku": [u("1481627834876-b7833e8f5570"), u("1503676260728-1c00da094a0b")],
  "marketplace:fashion": [u("1441986300917-64674bd600d8")],
  "marketplace:furnitur": [u("1555041469-a586c61ea9bc"), u("1522708323590-d24dbb6b0267")],
  marketplace: [
    u("1496181133206-80ce9b88a853"),
    u("1481627834876-b7833e8f5570"),
    u("1441986300917-64674bd600d8"),
    u("1555041469-a586c61ea9bc"),
  ],
  kost: [
    u("1522708323590-d24dbb6b0267"),
    u("1505693416388-ac5ce068fe85"),
    u("1560448204-e02f11c3d0e2"),
  ],
  "service:desain": [u("1561070791-2526d30994b5"), u("1499750310107-5fef28a66643")],
  "service:foto": [u("1516035069371-29a1b244cc32")],
  "service:les": [u("1434030216411-0b793f4b4173"), u("1503676260728-1c00da094a0b")],
  service: [
    u("1499750310107-5fef28a66643"),
    u("1561070791-2526d30994b5"),
    u("1516035069371-29a1b244cc32"),
    u("1434030216411-0b793f4b4173"),
  ],
  "lostfound:dompet": [u("1627123424574-724758594e93")],
  "lostfound:hp": [u("1511707171634-5f897ff02aa9")],
  "lostfound:tas": [u("1553062407-98eeb64c6a62")],
  lostfound: [
    u("1627123424574-724758594e93"),
    u("1511707171634-5f897ff02aa9"),
    u("1553062407-98eeb64c6a62"),
  ],
  event: [
    u("1540575467063-178a50c2df87"),
    u("1475721027785-f74eccf877e2"),
    u("1523580494863-6f3031224c94"),
  ],
};

function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function normalizedHint(hint?: string | null): string {
  return (hint ?? "").toLowerCase();
}

// Map a free-text category/title hint to a pool key suffix.
function poolKeyFor(module: ImageModule, hint?: string | null): string {
  const h = normalizedHint(hint);
  if (module === "marketplace") {
    if (/elektronik|gadget|laptop|hp|komputer|headphone/.test(h)) return "marketplace:elektronik";
    if (/buku|catatan|kitab|novel|komik/.test(h)) return "marketplace:buku";
    if (/pakaian|fashion|baju|sepatu|tas|aksesori/.test(h)) return "marketplace:fashion";
    if (/furnitur|furniture|mebel|lemari|kasur|meja|kursi|kamar/.test(h)) return "marketplace:furnitur";
    return "marketplace";
  }
  if (module === "service") {
    if (/desain|design|grafis|logo|video|edit/.test(h)) return "service:desain";
    if (/foto|photo|kamera|camera/.test(h)) return "service:foto";
    if (/les|tutor|privat|skripsi|tugas|pelajaran/.test(h)) return "service:les";
    return "service";
  }
  if (module === "lostfound") {
    if (/dompet|wallet/.test(h)) return "lostfound:dompet";
    if (/hp|handphone|phone|ponsel|iphone/.test(h)) return "lostfound:hp";
    if (/tas|bag|ransel|backpack|koper/.test(h)) return "lostfound:tas";
    return "lostfound";
  }
  return module;
}

/** Deterministically pick a curated fallback photo for a module + item. */
export function pickFallbackImage(
  module: ImageModule,
  seed: string | number,
  hint?: string | null
): string {
  const pool = POOLS[poolKeyFor(module, hint)] ?? POOLS[module] ?? POOLS.marketplace;
  return pool[hashSeed(`${module}:${seed}`) % pool.length];
}

/** API origin derived from NEXT_PUBLIC_API_URL (strips the trailing /api). */
export function apiOrigin(): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
  return base.replace(/\/api$/, "");
}

/** Resolve a backend relative `file_path` (or absolute URL) to a loadable URL. */
export function resolveStorageUrl(filePath: string): string {
  const trimmed = filePath.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return `${apiOrigin()}${trimmed}`;
  return `${apiOrigin()}/storage/${trimmed.replace(/^storage\//, "")}`;
}

function firstUsableImage(images?: ApiImage[] | null): string | null {
  if (!images) return null;
  for (const img of images) {
    if (img.url?.trim()) return img.url.trim();
    if (img.file_path?.trim()) return resolveStorageUrl(img.file_path);
  }
  return null;
}

export type ResolveImageOptions = {
  module: ImageModule;
  seed: string | number;
  /** Free-text hint (category name or title) to refine the fallback pool. */
  hint?: string | null;
  /** Backend `images` relation; first usable entry wins. */
  images?: ApiImage[] | null;
  /** Direct image URL override (takes precedence over `images`). */
  src?: string | null;
};

/**
 * Resolve the display image for a listing: explicit src → first backend
 * image → deterministic curated fallback. Never returns an empty string.
 */
export function resolveListingImage(options: ResolveImageOptions): string {
  const direct = options.src?.trim();
  if (direct) {
    return /^https?:\/\//i.test(direct) || direct.startsWith("/") ? direct : resolveStorageUrl(direct);
  }
  return (
    firstUsableImage(options.images) ??
    pickFallbackImage(options.module, options.seed, options.hint)
  );
}

/** Final safety-net image when even the curated fallback fails to load. */
export function picsumFallback(module: ImageModule, seed: string | number): string {
  return `https://picsum.photos/seed/${module}-${seed}/800/600`;
}
