import type { Presentation, Slide } from "@/types";

const MAX_STRING_LENGTH = 100_000;
const MAX_SLIDES = 200;
const MAX_PRESENTATIONS = 50;

function isValidString(v: unknown, maxLen = MAX_STRING_LENGTH): v is string {
  return typeof v === "string" && v.length <= maxLen;
}

export function isValidSlide(s: unknown): s is Slide {
  if (!s || typeof s !== "object") return false;
  const slide = s as Record<string, unknown>;
  if (!isValidString(slide.id, 100) || !isValidString(slide.title, 500)) return false;
  if (slide.type === "code") {
    return isValidString(slide.code) && isValidString(slide.language, 50);
  }
  if (slide.type === "content") {
    return (
      isValidString(slide.body) &&
      typeof slide.fontSize === "number" &&
      slide.fontSize >= 8 &&
      slide.fontSize <= 200
    );
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
