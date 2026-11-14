"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

interface BpImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallback?: ReactNode;
}

/** Renders a BP log image unoptimized (for blob previews and private signed URLs) with error fallback. */
export function BpImage({
  src,
  alt,
  width,
  height,
  className,
  fallback = null,
}: BpImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (failedSrc === src) {
    return <>{fallback}</>;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}
