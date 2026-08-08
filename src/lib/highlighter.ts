import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import githubDark from "@shikijs/themes/github-dark";
import typescript from "@shikijs/langs/typescript";
import javascript from "@shikijs/langs/javascript";
import html from "@shikijs/langs/html";
import css from "@shikijs/langs/css";
import json from "@shikijs/langs/json";
import python from "@shikijs/langs/python";
import markdown from "@shikijs/langs/markdown";
import jsx from "@shikijs/langs/jsx";
import tsx from "@shikijs/langs/tsx";

export const HIGHLIGHT_THEME = "github-dark";

// Single source of truth for supported languages — keep in sync with the
// grammar imports above.
export const HIGHLIGHT_LANGS = [
  "typescript",
  "javascript",
  "html",
  "css",
  "json",
  "python",
  "markdown",
  "jsx",
  "tsx",
] as const;

export type SupportedTheme = typeof HIGHLIGHT_THEME;
export type SupportedLang = (typeof HIGHLIGHT_LANGS)[number];

export function isSupportedLang(lang: string): lang is SupportedLang {
  return (HIGHLIGHT_LANGS as readonly string[]).includes(lang);
}

let highlighterPromise: Promise<HighlighterCore> | null = null;

/** Module-level singleton highlighter. Uses shiki's JavaScript RegExp engine,
 *  so no oniguruma WASM is downloaded or initialized. */
export function getAppHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [githubDark],
      langs: [typescript, javascript, html, css, json, python, markdown, jsx, tsx],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighterPromise;
}
