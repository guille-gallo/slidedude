"use client";

import { useEffect, useState } from "react";
import type { HighlighterCore } from "shiki/core";
import {
  getAppHighlighter,
  HIGHLIGHT_LANGS,
  type SupportedLang,
  type SupportedTheme,
} from "@/lib/highlighter";

export type { SupportedLang, SupportedTheme };

export const LANG_LIST: readonly string[] = HIGHLIGHT_LANGS;

export function useHighlighter() {
  const [highlighter, setHighlighter] = useState<HighlighterCore | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAppHighlighter().then((h) => {
      if (!cancelled) setHighlighter(h);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return highlighter;
}
