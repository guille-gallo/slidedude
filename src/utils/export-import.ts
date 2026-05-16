import type { Presentation } from "@/types";
import { generateId } from "@/utils/id";
import { isValidSlide, normalizeSlide } from "@/lib/validation";

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

    // Normalize each slide (migrates legacy imageDataUrl → imageDataUrls)
    // then regenerate all IDs to avoid collisions
    const slides = (data.slides as unknown[]).map((s) => ({
      ...normalizeSlide(s as Record<string, unknown>),
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
