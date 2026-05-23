import type { Presentation, Slide } from "@/types";
import { MAX_IMAGES_PER_SLIDE, MAX_IMAGE_BYTES } from "@/lib/constants";

const MAX_STRING_LENGTH = 100_000;
const MAX_SLIDES = 200;
export const MAX_PRESENTATIONS = 50;

/** Allowed MIME sub-types for embedded image data URLs (SVG excluded — script vector). */
const IMAGE_DATA_URL_RE = /^data:image\/(webp|png|jpeg|gif);base64,([A-Za-z0-9+/]+=*)$/;

/**
 * Validates a single image data URL:
 * - Must match `data:image/<allowed>;base64,<base64-data>`.
 * - Decoded byte size must not exceed MAX_IMAGE_BYTES.
 */
export function isValidImageDataUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = IMAGE_DATA_URL_RE.exec(value);
  if (!match) return false;
  // Estimate decoded size: base64 chars → ~3/4 bytes, minus padding.
  const base64 = match[2];
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const decodedBytes = Math.floor((base64.length * 3) / 4) - padding;
  return decodedBytes <= MAX_IMAGE_BYTES;
}

/**
 * Migrates a raw slide object from the legacy shape (imageDataUrl: string | null)
 * to the current shape (imageDataUrls: string[]).
 * Returns a new object only when migration is needed; otherwise returns the input.
 */
export function normalizeSlide(raw: Record<string, unknown>): Record<string, unknown> {
  if (raw.type !== "content") return raw;
  if (Array.isArray(raw.imageDataUrls)) return raw;
  // Legacy field present: migrate to array.
  const legacy = raw.imageDataUrl;
  const imageDataUrls = typeof legacy === "string" ? [legacy] : [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { imageDataUrl: _dropped, ...rest } = raw;
  return { ...rest, imageDataUrls };
}

function isValidString(v: unknown, maxLen = MAX_STRING_LENGTH): v is string {
  return typeof v === "string" && v.length <= maxLen;
}

function isValidOptionalTitleFontSize(value: unknown): boolean {
  return value === undefined || (typeof value === "number" && value >= 16 && value <= 96);
}

export function isValidSlide(s: unknown): s is Slide {
  if (!s || typeof s !== "object") return false;
  const slide = normalizeSlide(s as Record<string, unknown>);
  if (!isValidString(slide.id, 100) || !isValidString(slide.title, 500)) return false;
  // Optional `section` (free-text grouping label)
  if (slide.section !== undefined && !isValidString(slide.section, 200)) return false;
  if (slide.type === "code") {
    return (
      isValidOptionalTitleFontSize(slide.titleFontSize) &&
      isValidString(slide.code) &&
      isValidString(slide.language, 50)
    );
  }
  if (slide.type === "content") {
    if (!isValidString(slide.body)) return false;
    if (typeof slide.fontSize !== "number" || slide.fontSize < 8 || slide.fontSize > 200) return false;
    const images = slide.imageDataUrls;
    if (!Array.isArray(images)) return false;
    if (images.length > MAX_IMAGES_PER_SLIDE) return false;
    return images.every(isValidImageDataUrl);
  }
  if (slide.type === "mermaid") {
    return isValidOptionalTitleFontSize(slide.titleFontSize) && isValidString(slide.source);
  }
  return false;
}

export function isValidPresentation(p: unknown): p is Presentation {
  if (!p || typeof p !== "object") return false;
  const obj = p as Record<string, unknown>;
  return (
    isValidString(obj.id, 100) &&
    isValidString(obj.name, 500) &&
    Array.isArray(obj.slides) &&
    obj.slides.length <= MAX_SLIDES &&
    typeof obj.activeSlideIndex === "number" &&
    obj.activeSlideIndex >= 0
  );
}

export function isValidPresentations(data: unknown): data is Presentation[] {
  return (
    Array.isArray(data) &&
    data.length <= MAX_PRESENTATIONS &&
    data.every(isValidPresentation)
  );
}

// Keep the type export tidy — consumers that just need the list of sub-types can import this.
export type AllowedImageSubtype = "webp" | "png" | "jpeg" | "gif";
