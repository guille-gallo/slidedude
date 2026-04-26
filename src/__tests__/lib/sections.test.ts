import { describe, it, expect } from "vitest";
import { groupSections, findSection } from "@/lib/sections";
import type { Slide } from "@/types";

function codeSlide(id: string, section?: string): Slide {
  return { id, type: "code", title: "", code: "", language: "ts", section };
}

describe("groupSections", () => {
  it("groups contiguous slides with the same section", () => {
    const slides = [
      codeSlide("a", "Context"),
      codeSlide("b", "Context"),
      codeSlide("c", "Decision"),
      codeSlide("d", "Decision"),
      codeSlide("e", "Consequences"),
    ];
    const groups = groupSections(slides);
    expect(groups).toHaveLength(3);
    expect(groups[0]).toMatchObject({ name: "Context", start: 0, end: 1, size: 2 });
    expect(groups[1]).toMatchObject({ name: "Decision", start: 2, end: 3, size: 2 });
    expect(groups[2]).toMatchObject({ name: "Consequences", start: 4, end: 4, size: 1 });
  });

  it("treats undefined and empty sections as null", () => {
    const slides = [
      codeSlide("a"),
      codeSlide("b", ""),
      codeSlide("c", "  "),
      codeSlide("d", "Real"),
    ];
    const groups = groupSections(slides);
    expect(groups).toHaveLength(2);
    expect(groups[0].name).toBe(null);
    expect(groups[0].size).toBe(3);
    expect(groups[1].name).toBe("Real");
  });

  it("splits non-contiguous repeats into separate groups", () => {
    const slides = [
      codeSlide("a", "X"),
      codeSlide("b", "Y"),
      codeSlide("c", "X"),
    ];
    const groups = groupSections(slides);
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.name)).toEqual(["X", "Y", "X"]);
  });

  it("returns empty array for empty input", () => {
    expect(groupSections([])).toEqual([]);
  });
});

describe("findSection", () => {
  const slides = [
    codeSlide("a", "Context"),
    codeSlide("b", "Context"),
    codeSlide("c", "Decision"),
  ];

  it("returns the section and 0-based offset within it", () => {
    expect(findSection(slides, 0)).toEqual({
      section: { name: "Context", start: 0, end: 1, size: 2 },
      indexInSection: 0,
    });
    expect(findSection(slides, 1)?.indexInSection).toBe(1);
    expect(findSection(slides, 2)?.indexInSection).toBe(0);
  });

  it("returns null for out-of-range indices", () => {
    expect(findSection(slides, -1)).toBe(null);
    expect(findSection(slides, 99)).toBe(null);
  });
});
