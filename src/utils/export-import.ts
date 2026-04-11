import type { Presentation } from "@/types";
import { generateId } from "@/utils/id";

export function exportPresentation(presentation: Presentation): void {
  const data = JSON.stringify(presentation, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const safeName = presentation.name
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${safeName}-${date}.slidedude.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function isValidSlide(s: unknown): boolean {
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

export function importPresentation(json: string): Presentation | null {
  try {
    const data = JSON.parse(json) as Record<string, unknown>;
    if (
      typeof data.name !== "string" ||
      !Array.isArray(data.slides) ||
      data.slides.length === 0 ||
      !data.slides.every(isValidSlide)
    ) {
      return null;
    }

    // Regenerate all IDs to avoid collisions
    const slides = data.slides.map((s: Record<string, unknown>) => ({
      ...s,
      id: generateId(),
    }));

    return {
      id: generateId(),
      name: data.name,
      slides,
      activeSlideIndex: 0,
    } as Presentation;
  } catch {
    return null;
  }
}
