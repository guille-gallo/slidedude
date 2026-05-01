import { describe, expect, it } from "vitest";
import {
  CODE_PRESENTATION_MAX_CHARS,
  CODE_PRESENTATION_MAX_LINES,
  getCodePresentationBlockers,
  getCodeLimitInfo,
  limitCodeForPresentation,
} from "@/lib/code-limits";

describe("code presentation limits", () => {
  it("keeps short snippets inside the presentation limits", () => {
    const info = getCodeLimitInfo("const hello = 'world';");

    expect(info.lineCount).toBe(1);
    expect(info.isOverLimit).toBe(false);
    expect(info.blocksPresentation).toBe(false);
  });

  it("treats exactly the maximum line count as still presentable", () => {
    const code = Array.from({ length: CODE_PRESENTATION_MAX_LINES }, (_, index) => `const line${index} = ${index};`).join("\n");
    const info = getCodeLimitInfo(code);

    expect(info.isOverLimit).toBe(false);
    expect(info.isAtLineLimit).toBe(true);
    expect(info.blocksPresentation).toBe(false);
  });

  it("flags slides that exceed the maximum line count as blocking", () => {
    const code = Array.from({ length: CODE_PRESENTATION_MAX_LINES + 1 }, (_, index) => `const line${index} = ${index};`).join("\n");
    const info = getCodeLimitInfo(code);

    expect(info.isOverLimit).toBe(true);
    expect(info.isOverLineLimit).toBe(true);
    expect(info.blocksPresentation).toBe(true);
  });

  it("reports code slides that block presentation", () => {
    const code = Array.from({ length: CODE_PRESENTATION_MAX_LINES + 1 }, (_, index) => `const line${index} = ${index};`).join("\n");
    const blockers = getCodePresentationBlockers([
      {
        id: "slide-1",
        type: "code",
        title: "Too long",
        code,
        language: "typescript",
      },
    ]);

    expect(blockers).toEqual([
      {
        index: 0,
        title: "Too long",
        lineCount: CODE_PRESENTATION_MAX_LINES + 1,
        charCount: code.length,
      },
    ]);
  });

  it("limits pasted snippets to the maximum line count", () => {
    const code = Array.from({ length: 70 }, (_, index) => `const line${index} = ${index};`).join("\n");
    const limited = limitCodeForPresentation(code);

    expect(limited.changed).toBe(true);
    expect(limited.hitLineLimit).toBe(true);
    expect(limited.visibleLineCount).toBe(CODE_PRESENTATION_MAX_LINES);
    expect(getCodeLimitInfo(limited.code).isOverLimit).toBe(false);
  });

  it("limits very long code by character count", () => {
    const code = `const message = "${"x".repeat(CODE_PRESENTATION_MAX_CHARS + 100)}";`;
    const info = getCodeLimitInfo(code);
    const limited = limitCodeForPresentation(code);

    expect(info.isOverLimit).toBe(true);
    expect(limited.hitCharLimit).toBe(true);
    expect(limited.code.length).toBe(CODE_PRESENTATION_MAX_CHARS);
  });
});
