import { describe, expect, it } from "vitest";
import {
  createPresentationFromTemplate,
  createTutorialPresentation,
  PRESENTATION_TEMPLATES,
} from "@/lib/templates";
import { CODE_PRESENTATION_MAX_LINES, getCodePresentationBlockers } from "@/lib/code-limits";

describe("presentation templates", () => {
  it("creates a tutorial deck with supported slide types", () => {
    const tutorial = createTutorialPresentation();

    expect(tutorial.name).toBe("slidedude Tutorial");
    expect(tutorial.activeSlideIndex).toBe(0);
    expect(tutorial.slides.length).toBeGreaterThanOrEqual(5);
    expect(new Set(tutorial.slides.map((slide) => slide.type))).toEqual(
      new Set(["content", "code", "mermaid"])
    );
  });

  it("creates starter templates with fresh presentation and slide ids", () => {
    const template = PRESENTATION_TEMPLATES[0];
    const first = createPresentationFromTemplate(template.id);
    const second = createPresentationFromTemplate(template.id);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first?.id).not.toBe(second?.id);
    expect(first?.slides.map((slide) => slide.id)).not.toEqual(second?.slides.map((slide) => slide.id));
    expect(first?.slides).toHaveLength(template.slides.length);
  });

  it("keeps Technical Talk code slides distinct and presentation-sized", () => {
    const technicalTalk = createPresentationFromTemplate("technical-talk");
    const codeSlides = technicalTalk?.slides.filter((slide) => slide.type === "code") ?? [];
    const codeBodies = codeSlides.map((slide) => slide.code);

    expect(new Set(codeBodies).size).toBe(codeBodies.length);
    expect(codeSlides.map((slide) => slide.code.split("\n").length)).toEqual([10, 15, 13, 13]);
    expect(codeSlides.every((slide) => slide.code.split("\n").length <= CODE_PRESENTATION_MAX_LINES)).toBe(true);
    expect(getCodePresentationBlockers(technicalTalk?.slides ?? [])).toEqual([]);
  });

  it("returns null for an unknown template", () => {
    expect(createPresentationFromTemplate("missing-template")).toBeNull();
  });
});
