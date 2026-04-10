"use client";

import { useEffect, useState } from "react";
import type { HighlighterCore } from "shiki";
import { createHighlighter } from "shiki/bundle/web";

const THEMES = [
  "github-dark",
  "github-light",
  "nord",
  "vitesse-dark",
  "vitesse-light",
  "one-dark-pro",
  "dracula",
  "min-dark",
  "min-light",
] as const;

const INITIAL_LANGS = [
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

export type SupportedTheme = (typeof THEMES)[number];
export type SupportedLang = (typeof INITIAL_LANGS)[number];

export const THEME_LIST: readonly string[] = THEMES;
export const LANG_LIST: readonly string[] = INITIAL_LANGS;

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [...THEMES],
      langs: [...INITIAL_LANGS],
    });
  }
  return highlighterPromise;
}

export function useHighlighter() {
  const [highlighter, setHighlighter] = useState<HighlighterCore | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((h) => {
      if (!cancelled) setHighlighter(h);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return highlighter;
}
