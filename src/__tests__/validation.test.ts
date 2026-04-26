import { describe, it, expect } from "vitest";
import {
  isValidSlide,
  isValidPresentation,
  isValidPresentations,
} from "@/lib/validation";

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

  it("accepts a valid content slide", () => {
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
