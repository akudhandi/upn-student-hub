"use client";

import { useState } from "react";
import {
  picsumFallback,
  resolveListingImage,
  type ApiImage,
  type ImageModule,
} from "@/lib/images";

type ListingImageProps = {
  module: ImageModule;
  /** Stable per-item seed (id) so the fallback photo is deterministic. */
  seed: string | number;
  alt: string;
  className?: string;
  /** Category name or title hint to refine the fallback pool. */
  hint?: string | null;
  /** Backend `images` relation. */
  images?: ApiImage[] | null;
  /** Direct image URL override. */
  src?: string | null;
  eager?: boolean;
};

// Image with a two-level fallback chain: resolved source → picsum safety
// net → styled placeholder block. Remote URLs are dynamic per listing, so a
// plain <img> is used instead of next/image (no remotePatterns config).
export default function ListingImage({
  module,
  seed,
  alt,
  className,
  hint,
  images,
  src,
  eager = false,
}: ListingImageProps) {
  const primary = resolveListingImage({ module, seed, hint, images, src });
  const picsumKey = `${module}-${seed}`;
  // Failed URLs are keyed by value, so a new listing (new primary) never
  // inherits a previous error state — no reset effect needed.
  const [failedPrimary, setFailedPrimary] = useState<string | null>(null);
  const [failedPicsumKey, setFailedPicsumKey] = useState<string | null>(null);

  const usePicsum = failedPrimary === primary;
  const exhausted = usePicsum && failedPicsumKey === picsumKey;

  function handleError() {
    if (!usePicsum) {
      setFailedPrimary(primary);
    } else {
      setFailedPicsumKey(picsumKey);
    }
  }

  if (exhausted) {
    return (
      <div className={`flex items-center justify-center bg-[#EEF2F7] ${className ?? ""}`} role="img" aria-label={alt}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-slate-400">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M3 16L8.5 11L13 15.5L16 13L21 18" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamic listing URLs can't use next/image remotePatterns
    <img
      src={usePicsum ? picsumFallback(module, seed) : primary}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      onError={handleError}
    />
  );
}
