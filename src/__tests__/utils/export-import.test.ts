import { describe, it, expect, vi, beforeEach } from "vitest";
import { importPresentation } from "@/utils/export-import";

// Mock generateId to return predictable values
let idCounter = 0;
vi.mock("@/utils/id", () => ({
  generateId: () => `mock-id-${++idCounter}`,
}));

beforeEach(() => {
  idCounter = 0;
});

const validCodeSlide = {
  id: "original-id",
  type: "code",
  title: "Hello",
  code: 'const x = 1;',
  language: "typescript",
};

const validContentSlide = {
  id: "original-id-2",
  type: "content",
  title: "Intro",
  body: "Welcome",
  imageDataUrls: [],
  fontSize: 32,
};

describe("importPresentation", () => {
  it("imports a valid presentation with code slides", () => {
    const json = JSON.stringify({
      name: "Test",
      slides: [validCodeSlide],
    });

    const result = importPresentation(json);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Test");
    expect(result!.slides).toHaveLength(1);
    expect(result!.activeSlideIndex).toBe(0);
  });

  it("imports a valid presentation with content slides", () => {
    const json = JSON.stringify({
      name: "Content Test",
      slides: [validContentSlide],
    });

    const result = importPresentation(json);
    expect(result).not.toBeNull();
    expect(result!.slides[0].type).toBe("content");
  });

  it("regenerates all IDs to avoid collisions", () => {
    const json = JSON.stringify({
      name: "Test",
      slides: [validCodeSlide, validContentSlide],
    });

    const result = importPresentation(json);
    expect(result).not.toBeNull();
    // Slide IDs should be regenerated
    expect(result!.slides[0].id).not.toBe("original-id");
    expect(result!.slides[1].id).not.toBe("original-id-2");
    // Presentation ID should be regenerated
    expect(result!.id).toBeTruthy();
  });

  it("returns null for invalid JSON", () => {
    expect(importPresentation("not json")).toBeNull();
  });

  it("returns null when name is missing", () => {
    const json = JSON.stringify({ slides: [validCodeSlide] });
    expect(importPresentation(json)).toBeNull();
  });

  it("returns null when slides is empty", () => {
    const json = JSON.stringify({ name: "Test", slides: [] });
    expect(importPresentation(json)).toBeNull();
  });

  it("returns null when slides is not an array", () => {
    const json = JSON.stringify({ name: "Test", slides: "nope" });
    expect(importPresentation(json)).toBeNull();
  });

  it("returns null when a slide has invalid structure", () => {
    const json = JSON.stringify({
      name: "Test",
      slides: [{ id: "x", type: "code" }], // missing title, code, language
    });
    expect(importPresentation(json)).toBeNull();
  });

  it("returns null for unknown slide type", () => {
    const json = JSON.stringify({
      name: "Test",
      slides: [{ id: "x", type: "unknown", title: "Bad" }],
    });
    expect(importPresentation(json)).toBeNull();
  });

  it("returns null when a code slide is missing code field", () => {
    const json = JSON.stringify({
      name: "Test",
      slides: [{ id: "x", type: "code", title: "T", language: "ts" }],
    });
    expect(importPresentation(json)).toBeNull();
  });

  it("returns null when a content slide is missing fontSize", () => {
    const json = JSON.stringify({
      name: "Test",
      slides: [
        { id: "x", type: "content", title: "T", body: "B", imageDataUrls: [] },
      ],
    });
    expect(importPresentation(json)).toBeNull();
  });

  it("migrates legacy imageDataUrl string to imageDataUrls on import", () => {
    const json = JSON.stringify({
      name: "Legacy Deck",
      slides: [
        {
          id: "s1",
          type: "content",
          title: "Old",
          body: "Body",
          fontSize: 32,
          imageDataUrl: "data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoAAADQAQCdASoBAAEAAkA4JYgCdAEO/gHOAAA=",
        },
      ],
    });
    const result = importPresentation(json);
    expect(result).not.toBeNull();
    const slide = result!.slides[0] as import("@/types").ContentSlide;
    expect(slide.imageDataUrls).toHaveLength(1);
    expect("imageDataUrl" in slide).toBe(false);
  });

  it("migrates legacy imageDataUrl: null to empty array on import", () => {
    const json = JSON.stringify({
      name: "Legacy Deck",
      slides: [
        {
          id: "s1",
          type: "content",
          title: "Old",
          body: "Body",
          fontSize: 32,
          imageDataUrl: null,
        },
      ],
    });
    const result = importPresentation(json);
    expect(result).not.toBeNull();
    const slide = result!.slides[0] as import("@/types").ContentSlide;
    expect(slide.imageDataUrls).toEqual([]);
  });
});
