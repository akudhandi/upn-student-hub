"use client";

import { useState } from "react";

export default function AdminImage({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackLabel = "N/A",
  loading,
}: {
  src: string | null | undefined;
  alt: string;
  className: string;
  fallbackClassName: string;
  fallbackLabel?: string;
  loading?: "lazy" | "eager";
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div
        className={fallbackClassName}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
      >
        {fallbackLabel}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailedSrc(src)}
    />
  );
}
