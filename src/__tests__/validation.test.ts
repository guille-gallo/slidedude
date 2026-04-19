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
});
