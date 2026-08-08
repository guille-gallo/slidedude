import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { createRequire } from "module";

vi.mock("server-only", () => ({}));

import {
  generateOfflineHtml,
  MAGIC_MOVE_CSS,
  MAGIC_MOVE_RENDERER_JS,
} from "@/lib/export-html";
import type { Presentation } from "@/types";

const require = createRequire(import.meta.url);
const magicMoveDistDir = require
  .resolve("@shikijs/magic-move/style.css")
  .replace(/style\.css$/, "");

/** Extract an object literal assigned to `name` from a JS source string. */
function extractObjectLiteral(source: string, name: string): Record<string, unknown> {
  const match = source.match(new RegExp(`${name}\\s*=\\s*({[^}]+})`));
  if (!match) throw new Error(`${name} not found in source`);
  return new Function(`return (${match[1]})`)() as Record<string, unknown>;
}

describe("magic-move drift guard", () => {
  // These tests pin our vendored copies of @shikijs/magic-move internals to the
  // installed package. If a bump fails them, re-sync the vendored strings in
  // src/lib/export-html.ts (see comments there).
  it("MAGIC_MOVE_CSS matches the package style.css exactly", () => {
    const packaged = readFileSync(`${magicMoveDistDir}style.css`, "utf8").trim();
    expect(MAGIC_MOVE_CSS).toBe(packaged);
  });

  it("inlined renderer defaults match the package renderer", () => {
    const packagedSource = readFileSync(`${magicMoveDistDir}renderer.mjs`, "utf8");
    const packagedDefaults = extractObjectLiteral(packagedSource, "const defaultOptions");
    const vendoredDefaults = extractObjectLiteral(
      MAGIC_MOVE_RENDERER_JS,
      "const defaultMagicMoveOptions",
    );
    expect(vendoredDefaults).toEqual(packagedDefaults);
  });

  it("inlined renderer uses the same transition class names as the package", () => {
    const packagedSource = readFileSync(`${magicMoveDistDir}renderer.mjs`, "utf8");
    const suffixes = [...packagedSource.matchAll(/CLASS_PREFIX}-([a-z-]+)/g)].map((m) => m[1]);
    expect(suffixes.length).toBeGreaterThan(0);
    for (const suffix of new Set(suffixes)) {
      expect(MAGIC_MOVE_RENDERER_JS).toContain(`'-${suffix}'`);
    }
  });
});

describe("generateOfflineHtml", () => {
  const presentation: Presentation = {
    id: "p1",
    name: "Test deck",
    slides: [
      {
        id: "s1",
        type: "code",
        title: "One",
        language: "typescript",
        code: "const a = 1;",
        notes: "",
        fontSize: 16,
      },
      {
        id: "s2",
        type: "code",
        title: "Two",
        language: "typescript",
        code: "const a = 2;\nconst b = 3;",
        notes: "",
        fontSize: 16,
      },
    ],
    activeSlideIndex: 0,
  } as unknown as Presentation;

  it("produces a self-contained HTML document with precomputed tokens", async () => {
    const html = await generateOfflineHtml(presentation);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('id="magic-move-container"');
    expect(html).toContain("class MagicMoveRenderer");
    expect(html).toContain(MAGIC_MOVE_CSS);
    // Tokens for both code slides and the transition between them.
    expect(html).toContain("CODE_TOKENS");
    expect(html).toContain("TRANSITIONS");
    expect(html).toContain("0_1");
  });

  it("highlights code through the shared highlighter (token spans present)", async () => {
    const html = await generateOfflineHtml(presentation);
    // github-dark colors tokens; serialized KeyedTokensInfo must carry colors.
    expect(html).toMatch(/"color":"#/);
  });
});
