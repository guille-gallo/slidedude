import type { Presentation, Slide } from "@/types";

export function isValidSlide(s: unknown): s is Slide {
  if (!s || typeof s !== "object") return false;
  const slide = s as Record<string, unknown>;
  if (typeof slide.id !== "string" || typeof slide.title !== "string") return false;
  if (slide.type === "code") {
    return typeof slide.code === "string" && typeof slide.language === "string";
  }
  if (slide.type === "content") {
    return typeof slide.body === "string" && typeof slide.fontSize === "number";
  }
  return false;
}

export function isValidPresentation(p: unknown): p is Presentation {
  if (!p || typeof p !== "object") return false;
  const obj = p as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    Array.isArray(obj.slides) &&
    typeof obj.activeSlideIndex === "number"
  );
}

export function isValidPresentations(data: unknown): data is Presentation[] {
  return Array.isArray(data) && data.every(isValidPresentation);
}
