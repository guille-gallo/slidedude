"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";

interface ContentImageGridProps {
  images: string[];
  /** Extra class names applied to the outer wrapper. */
  className?: string;
}

/**
 * Column count derived from image count:
 * 1 → 1 col (full width)
 * 2 → 2 cols (side-by-side)
 * 3 → 3 cols (1 row, no wasted cell)
 * 4 → 2 cols (2×2)
 * 5–6 → 3 cols (2 rows)
 * 7–8 → 4 cols (2 rows)
 */
function colsForCount(count: number): number {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

const GRID_COLS_CLASS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

/**
 * Renders a responsive grid of content-slide images.
 * Fills all available vertical space via flex-1 so it works naturally inside
 * a flex column parent (present mode and editor preview).
 * Each image is clickable to open a full-screen lightbox.
 * Inside the lightbox, ArrowLeft/ArrowRight cycle images; Escape closes.
 */
export function ContentImageGrid({ images, className = "" }: ContentImageGridProps) {
  const [zoomed, setZoomed] = useState<number | null>(null);

  const closeZoom = useCallback(() => setZoomed(null), []);

  const prev = useCallback(() => {
    setZoomed((z) => (z === null ? null : (z - 1 + images.length) % images.length));
  }, [images.length]);

  const next = useCallback(() => {
    setZoomed((z) => (z === null ? null : (z + 1) % images.length));
  }, [images.length]);

  useEffect(() => {
    if (zoomed === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeZoom();
      } else if (e.key === "ArrowLeft") {
        e.stopPropagation();
        prev();
      } else if (e.key === "ArrowRight") {
        e.stopPropagation();
        next();
      }
    };

    // Capture phase so we intercept before the present-mode nav handler.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [zoomed, closeZoom, prev, next]);

  if (images.length === 0) return null;

  const cols = colsForCount(images.length);
  const gridColsClass = GRID_COLS_CLASS[cols];
  const sizesAttr = `(max-width: 768px) 100vw, ${Math.round(100 / cols)}vw`;

  return (
    <>
      {/* Grid — flex-1 min-h-0 so it fills remaining vertical space in parent flex column */}
      <div
        className={`grid gap-2 w-full flex-1 min-h-0 ${gridColsClass} ${className}`}
        style={{ gridAutoRows: "1fr" }}
      >
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Zoom image ${i + 1}`}
            onClick={() => setZoomed(i)}
            className="relative w-full overflow-hidden rounded-lg cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Image
              src={src}
              alt={`Slide image ${i + 1}`}
              fill
              unoptimized
              className="object-contain"
              sizes={sizesAttr}
            />
          </button>
        ))}
      </div>

      {/* Lightbox overlay — tabIndex makes it interactive for a11y, keydown handles Escape */}
      {zoomed !== null && (
        /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Image ${zoomed + 1} of ${images.length}`}
          tabIndex={-1}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 cursor-default"
          onClick={closeZoom}
          onKeyDown={(e) => { if (e.key === "Escape") closeZoom(); }}
        >
          {/* Close button */}
          <button
            type="button"
            aria-label="Close image zoom"
            onClick={closeZoom}
            className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            ✕
          </button>

          {/* Prev/Next arrows (only when >1 image) */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-14 top-1/2 -translate-y-1/2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                →
              </button>
            </>
          )}

          {/* Image container — stop click propagation so backdrop-click still works correctly */}
          <button
            type="button"
            aria-label={`Slide image ${zoomed + 1} full size`}
            className="relative h-[95vh] w-[95vw] cursor-default focus-visible:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[zoomed]}
              alt={`Slide image ${zoomed + 1}`}
              fill
              unoptimized
              className="object-contain"
              sizes="95vw"
            />
          </button>
          {images.length > 1 && (
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">
              {zoomed + 1} / {images.length}
            </span>
          )}
        </div>
      )}
    </>
  );
}
