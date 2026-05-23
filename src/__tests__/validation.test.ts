import { describe, it, expect } from "vitest";
import {
  isValidSlide,
  isValidPresentation,
  isValidPresentations,
  isValidImageDataUrl,
  normalizeSlide,
} from "@/lib/validation";
import { MAX_IMAGES_PER_SLIDE } from "@/lib/constants";

// Smallest valid WebP as a data URL (1x1 transparent, well-formed base64)
const VALID_WEBP = "data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoAAADQAQCdASoBAAEAAkA4JYgCdAEO/gHOAAA=";

describe("isValidSlide", () => {
  it("accepts a valid code slide", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "code",
        title: "T",
        code: "x",
        language: "ts",
      }),
    ).toBe(true);
  });

  it("accepts a code slide with a valid title font size", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "code",
        title: "T",
        titleFontSize: 44,
        code: "x",
        language: "ts",
      }),
    ).toBe(true);
  });

  it("rejects a code slide with an invalid title font size", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "code",
        title: "T",
        titleFontSize: 120,
        code: "x",
        language: "ts",
      }),
    ).toBe(false);
    expect(
      isValidSlide({
        id: "1",
        type: "code",
        title: "T",
        titleFontSize: "large",
        code: "x",
        language: "ts",
      }),
    ).toBe(false);
  });

  it("accepts a valid content slide with no images", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "content",
        title: "T",
        body: "B",
        fontSize: 32,
        imageDataUrls: [],
      }),
    ).toBe(true);
  });

  it("accepts a content slide with a valid image", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "content",
        title: "T",
        body: "B",
        fontSize: 32,
        imageDataUrls: [VALID_WEBP],
      }),
    ).toBe(true);
  });

  it("accepts a content slide with up to MAX_IMAGES_PER_SLIDE images", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "content",
        title: "T",
        body: "B",
        fontSize: 32,
        imageDataUrls: Array(MAX_IMAGES_PER_SLIDE).fill(VALID_WEBP),
      }),
    ).toBe(true);
  });

  it("rejects a content slide with more than MAX_IMAGES_PER_SLIDE images", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "content",
        title: "T",
        body: "B",
        fontSize: 32,
        imageDataUrls: Array(MAX_IMAGES_PER_SLIDE + 1).fill(VALID_WEBP),
      }),
    ).toBe(false);
  });

  it("rejects a content slide with a non-data-URL image", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "content",
        title: "T",
        body: "B",
        fontSize: 32,
        imageDataUrls: ["https://example.com/img.webp"],
      }),
    ).toBe(false);
  });

  it("rejects a content slide with a javascript: image URL", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "content",
        title: "T",
        body: "B",
        fontSize: 32,
        imageDataUrls: ["javascript:alert(1)"],
      }),
    ).toBe(false);
  });

  it("rejects a content slide with an SVG data URL", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "content",
        title: "T",
        body: "B",
        fontSize: 32,
        imageDataUrls: ["data:image/svg+xml;base64,PHN2Zy8+"],
      }),
    ).toBe(false);
  });

  it("migrates legacy imageDataUrl on the fly", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "content",
        title: "T",
        body: "B",
        fontSize: 32,
        imageDataUrl: VALID_WEBP,
      }),
    ).toBe(true);
  });

  it("migrates legacy imageDataUrl: null on the fly", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "content",
        title: "T",
        body: "B",
        fontSize: 32,
        imageDataUrl: null,
      }),
    ).toBe(true);
  });

  it("rejects null", () => {
    expect(isValidSlide(null)).toBe(false);
  });

  it("rejects non-object", () => {
    expect(isValidSlide("string")).toBe(false);
  });

  it("rejects slide missing id", () => {
    expect(isValidSlide({ type: "code", title: "T", code: "x", language: "ts" })).toBe(false);
  });

  it("rejects slide missing title", () => {
    expect(isValidSlide({ id: "1", type: "code", code: "x", language: "ts" })).toBe(false);
  });

  it("rejects code slide missing code", () => {
    expect(isValidSlide({ id: "1", type: "code", title: "T", language: "ts" })).toBe(false);
  });

  it("rejects code slide missing language", () => {
    expect(isValidSlide({ id: "1", type: "code", title: "T", code: "x" })).toBe(false);
  });

  it("rejects content slide missing body", () => {
    expect(isValidSlide({ id: "1", type: "content", title: "T", fontSize: 32 })).toBe(false);
  });

  it("rejects content slide missing fontSize", () => {
    expect(isValidSlide({ id: "1", type: "content", title: "T", body: "B" })).toBe(false);
  });

  it("rejects unknown type", () => {
    expect(isValidSlide({ id: "1", type: "unknown", title: "T" })).toBe(false);
  });

  it("accepts a valid mermaid slide", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "mermaid",
        title: "Diagram",
        source: "flowchart TB\n  A --> B",
      }),
    ).toBe(true);
  });

  it("accepts a mermaid slide with a valid title font size", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "mermaid",
        title: "Diagram",
        titleFontSize: 56,
        source: "flowchart TB\n  A --> B",
      }),
    ).toBe(true);
  });

  it("rejects a mermaid slide with an invalid title font size", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "mermaid",
        title: "Diagram",
        titleFontSize: 12,
        source: "flowchart TB\n  A --> B",
      }),
    ).toBe(false);
    expect(
      isValidSlide({
        id: "1",
        type: "mermaid",
        title: "Diagram",
        titleFontSize: "XL",
        source: "flowchart TB\n  A --> B",
      }),
    ).toBe(false);
  });

  it("rejects mermaid slide missing source", () => {
    expect(isValidSlide({ id: "1", type: "mermaid", title: "T" })).toBe(false);
  });

  it("accepts an optional section field", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "code",
        title: "T",
        code: "x",
        language: "ts",
        section: "Context",
      }),
    ).toBe(true);
  });

  it("rejects non-string section", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "code",
        title: "T",
        code: "x",
        language: "ts",
        section: 42,
      }),
    ).toBe(false);
  });
});

describe("isValidPresentation", () => {
  it("accepts a valid presentation", () => {
    expect(
      isValidPresentation({
        id: "p1",
        name: "Test",
        slides: [],
        activeSlideIndex: 0,
      }),
    ).toBe(true);
  });

  it("rejects null", () => {
    expect(isValidPresentation(null)).toBe(false);
  });

  it("rejects missing id", () => {
    expect(isValidPresentation({ name: "T", slides: [], activeSlideIndex: 0 })).toBe(false);
  });

  it("rejects missing name", () => {
    expect(isValidPresentation({ id: "1", slides: [], activeSlideIndex: 0 })).toBe(false);
  });

  it("rejects non-array slides", () => {
    expect(isValidPresentation({ id: "1", name: "T", slides: "bad", activeSlideIndex: 0 })).toBe(false);
  });

  it("rejects missing activeSlideIndex", () => {
    expect(isValidPresentation({ id: "1", name: "T", slides: [] })).toBe(false);
  });
});

describe("isValidPresentations", () => {
  it("accepts an array of valid presentations", () => {
    expect(
      isValidPresentations([
        { id: "1", name: "A", slides: [], activeSlideIndex: 0 },
        { id: "2", name: "B", slides: [], activeSlideIndex: 0 },
      ]),
    ).toBe(true);
  });

  it("accepts empty array", () => {
    expect(isValidPresentations([])).toBe(true);
  });

  it("rejects non-array", () => {
    expect(isValidPresentations("not array")).toBe(false);
  });

  it("rejects if any element is invalid", () => {
    expect(
      isValidPresentations([
        { id: "1", name: "A", slides: [], activeSlideIndex: 0 },
        { id: "2", name: "B" }, // missing slides + activeSlideIndex
      ]),
    ).toBe(false);
  });

  it("rejects if more than 50 presentations", () => {
    const many = Array.from({ length: 51 }, (_, i) => ({
      id: String(i),
      name: `P${i}`,
      slides: [],
      activeSlideIndex: 0,
    }));
    expect(isValidPresentations(many)).toBe(false);
  });
});

describe("bounds checking", () => {
  it("rejects slide with id longer than 100 chars", () => {
    expect(
      isValidSlide({
        id: "x".repeat(101),
        type: "code",
        title: "T",
        code: "x",
        language: "ts",
      }),
    ).toBe(false);
  });

  it("rejects slide with title longer than 500 chars", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "code",
        title: "x".repeat(501),
        code: "x",
        language: "ts",
      }),
    ).toBe(false);
  });

  it("rejects content slide with fontSize out of range (too small)", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "content",
        title: "T",
        body: "B",
        fontSize: 4,
      }),
    ).toBe(false);
  });

  it("rejects content slide with fontSize out of range (too large)", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "content",
        title: "T",
        body: "B",
        fontSize: 300,
      }),
    ).toBe(false);
  });

  it("rejects code slide with language longer than 50 chars", () => {
    expect(
      isValidSlide({
        id: "1",
        type: "code",
        title: "T",
        code: "x",
        language: "x".repeat(51),
      }),
    ).toBe(false);
  });

  it("rejects presentation with negative activeSlideIndex", () => {
    expect(
      isValidPresentation({
        id: "1",
        name: "T",
        slides: [],
        activeSlideIndex: -1,
      }),
    ).toBe(false);
  });

  it("rejects presentation with more than 200 slides", () => {
    const slides = Array.from({ length: 201 }, (_, i) => ({
      id: String(i),
      type: "code",
      title: "T",
      code: "x",
      language: "ts",
    }));
    expect(
      isValidPresentation({
        id: "1",
        name: "T",
        slides,
        activeSlideIndex: 0,
      }),
    ).toBe(false);
  });
});

describe("isValidImageDataUrl", () => {
  it("accepts a valid webp data URL", () => {
    expect(isValidImageDataUrl(VALID_WEBP)).toBe(true);
  });

  it("accepts a valid png data URL", () => {
    // Minimal 1×1 PNG base64
    expect(isValidImageDataUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")).toBe(true);
  });

  it("rejects an SVG data URL", () => {
    expect(isValidImageDataUrl("data:image/svg+xml;base64,PHN2Zy8+")).toBe(false);
  });

  it("rejects a javascript: URL", () => {
    expect(isValidImageDataUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects an http URL", () => {
    expect(isValidImageDataUrl("https://example.com/img.webp")).toBe(false);
  });

  it("rejects a non-string", () => {
    expect(isValidImageDataUrl(42)).toBe(false);
    expect(isValidImageDataUrl(null)).toBe(false);
  });

  it("rejects a data URL exceeding MAX_IMAGE_BYTES", () => {
    // Generate a base64 string whose decoded size exceeds 600 KB
    const oversize = "A".repeat(Math.ceil((600 * 1024 + 1) * 4 / 3));
    expect(isValidImageDataUrl(`data:image/webp;base64,${oversize}`)).toBe(false);
  });
});

describe("normalizeSlide", () => {
  it("passes through a non-content slide unchanged", () => {
    const raw = { type: "code", code: "x", language: "ts" };
    expect(normalizeSlide(raw)).toBe(raw);
  });

  it("passes through a content slide that already has imageDataUrls", () => {
    const raw = { type: "content", imageDataUrls: [VALID_WEBP] };
    expect(normalizeSlide(raw)).toBe(raw);
  });

  it("migrates legacy imageDataUrl string to imageDataUrls array", () => {
    const raw = { type: "content", imageDataUrl: VALID_WEBP };
    const result = normalizeSlide(raw);
    expect(result.imageDataUrls).toEqual([VALID_WEBP]);
    expect("imageDataUrl" in result).toBe(false);
  });

  it("migrates legacy imageDataUrl: null to empty array", () => {
    const raw = { type: "content", imageDataUrl: null };
    const result = normalizeSlide(raw);
    expect(result.imageDataUrls).toEqual([]);
    expect("imageDataUrl" in result).toBe(false);
  });
});
