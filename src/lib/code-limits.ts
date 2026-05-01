import type { Slide } from "@/types";

export const CODE_PRESENTATION_FONT_SIZE = 15;
export const CODE_PRESENTATION_LINE_HEIGHT = 1.6;
export const CODE_PRESENTATION_MAX_LINES = 24;
export const CODE_PRESENTATION_MAX_CHARS = 2_500;

export interface CodeLimitInfo {
  lineCount: number;
  charCount: number;
  longestLineLength: number;
  remainingLines: number;
  remainingChars: number;
  isAtLineLimit: boolean;
  isAtCharLimit: boolean;
  isOverLineLimit: boolean;
  isOverCharLimit: boolean;
  isOverLimit: boolean;
  blocksPresentation: boolean;
}

export interface CodePresentationBlocker {
  index: number;
  title: string;
  lineCount: number;
  charCount: number;
}

export interface LimitedCodeResult {
  code: string;
  changed: boolean;
  hitLineLimit: boolean;
  hitCharLimit: boolean;
  visibleLineCount: number;
}

export function getCodeLimitInfo(code: string): CodeLimitInfo {
  const lines = code.split("\n");
  const lineCount = lines.length;
  const charCount = code.length;
  const longestLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);

  return {
    lineCount,
    charCount,
    longestLineLength,
    remainingLines: Math.max(CODE_PRESENTATION_MAX_LINES - lineCount, 0),
    remainingChars: Math.max(CODE_PRESENTATION_MAX_CHARS - charCount, 0),
    isAtLineLimit: lineCount >= CODE_PRESENTATION_MAX_LINES,
    isAtCharLimit: charCount >= CODE_PRESENTATION_MAX_CHARS,
    isOverLineLimit: lineCount > CODE_PRESENTATION_MAX_LINES,
    isOverCharLimit: charCount > CODE_PRESENTATION_MAX_CHARS,
    isOverLimit: lineCount > CODE_PRESENTATION_MAX_LINES || charCount > CODE_PRESENTATION_MAX_CHARS,
    blocksPresentation: lineCount >= CODE_PRESENTATION_MAX_LINES || charCount >= CODE_PRESENTATION_MAX_CHARS,
  };
}

export function limitCodeForPresentation(code: string): LimitedCodeResult {
  let limitedCode = code;
  let hitLineLimit = false;
  let hitCharLimit = false;

  const lines = limitedCode.split("\n");
  if (lines.length > CODE_PRESENTATION_MAX_LINES) {
    limitedCode = lines.slice(0, CODE_PRESENTATION_MAX_LINES).join("\n");
    hitLineLimit = true;
  }

  if (limitedCode.length > CODE_PRESENTATION_MAX_CHARS) {
    limitedCode = limitedCode.slice(0, CODE_PRESENTATION_MAX_CHARS);
    hitCharLimit = true;
  }

  return {
    code: limitedCode,
    changed: limitedCode !== code,
    hitLineLimit,
    hitCharLimit,
    visibleLineCount: limitedCode.split("\n").length,
  };
}

export function getCodePresentationBlockers(slides: Slide[]): CodePresentationBlocker[] {
  return slides.flatMap((slide, index) => {
    if (slide.type !== "code") return [];
    const limit = getCodeLimitInfo(slide.code);
    if (!limit.blocksPresentation) return [];
    return [{
      index,
      title: slide.title || "Untitled code slide",
      lineCount: limit.lineCount,
      charCount: limit.charCount,
    }];
  });
}
