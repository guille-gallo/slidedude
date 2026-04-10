"use client";

import { useRef, useLayoutEffect, useMemo } from "react";
import type { HighlighterCore } from "shiki";

interface TokenSnapshot {
  left: number;
  top: number;
  content: string;
  color: string;
}

interface ProcessedToken {
  content: string;
  color: string;
  matchKey: string;
}

const DUR = 800;
const MOVE_EASING = "cubic-bezier(.2,0,.0,1)";
const FADE_IN_EASING = "cubic-bezier(0,.0,.2,1)";
const FADE_OUT_EASING = "cubic-bezier(.4,0,1,1)";
const MAX_GHOSTS = 60;
const LINE_STAGGER = 20;

export function CodeMorph({
  highlighter,
  code,
  lang,
  theme,
}: {
  highlighter: HighlighterCore;
  code: string;
  lang: string;
  theme: string;
}) {
  const preRef = useRef<HTMLPreElement>(null);
  const snapshotRef = useRef(new Map<string, TokenSnapshot>());

  const { lines, fg } = useMemo(() => {
    try {
      const result = highlighter.codeToTokens(code, { lang, theme });
      const counters = new Map<string, number>();
      const processed = result.tokens.map((line) =>
        line.map((tok): ProcessedToken => {
          const t = tok.content;
          const n = counters.get(t) || 0;
          counters.set(t, n + 1);
          return { content: t, color: tok.color || result.fg || "#d4d4d4", matchKey: `${t}##${n}` };
        })
      );
      return { lines: processed, fg: result.fg || "#d4d4d4" };
    } catch {
      return {
        lines: [[{ content: code, color: "#d4d4d4", matchKey: "fb##0" }]],
        fg: "#d4d4d4",
      };
    }
  }, [highlighter, code, lang, theme]);

  // useLayoutEffect: runs BEFORE paint so we can set initial transforms
  useLayoutEffect(() => {
    const pre = preRef.current;
    if (!pre) return;

    const oldSnap = snapshotRef.current;
    const isFirstRender = oldSnap.size === 0;

    const spans = pre.querySelectorAll<HTMLSpanElement>("span[data-mk]");
    const newSnap = new Map<string, TokenSnapshot>();
    const alive = new Set<string>();

    // 1. Read all new positions
    spans.forEach((s) => {
      const r = s.getBoundingClientRect();
      const key = s.dataset.mk!;
      alive.add(key);
      newSnap.set(key, { left: r.left, top: r.top, content: s.textContent || "", color: s.style.color });
    });

    if (!isFirstRender) {
      // 2. Build line index for staggering
      const lineMap = new Map<HTMLSpanElement, number>();
      let lastTop = -Infinity;
      let lineIdx = -1;
      spans.forEach((span) => {
        const top = newSnap.get(span.dataset.mk!)?.top ?? 0;
        if (top - lastTop > 2) { lineIdx++; lastTop = top; }
        lineMap.set(span, lineIdx);
      });

      // 3. BEFORE PAINT: set matched tokens at old position, hide new tokens
      spans.forEach((span) => {
        const key = span.dataset.mk!;
        const old = oldSnap.get(key);
        const cur = newSnap.get(key)!;

        if (old) {
          const dx = old.left - cur.left;
          const dy = old.top - cur.top;
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            span.style.transform = `translate(${dx}px,${dy}px)`;
          }
        } else {
          span.style.opacity = "0";
        }
      });

      // 4. Create ghosts for removed tokens BEFORE paint
      let ghostWrapper: HTMLDivElement | null = null;
      const ghostKeys: string[] = [];
      oldSnap.forEach((_, key) => {
        if (!alive.has(key)) ghostKeys.push(key);
      });

      if (ghostKeys.length > 0) {
        const cs = getComputedStyle(pre);
        ghostWrapper = document.createElement("div");
        ghostWrapper.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999";
        const count = Math.min(ghostKeys.length, MAX_GHOSTS);
        for (let i = 0; i < count; i++) {
          const saved = oldSnap.get(ghostKeys[i])!;
          const g = document.createElement("span");
          g.textContent = saved.content;
          g.style.cssText = `position:absolute;left:${saved.left}px;top:${saved.top}px;color:${saved.color};white-space:pre;font-family:${cs.fontFamily};font-size:${cs.fontSize};line-height:${cs.lineHeight}`;
          ghostWrapper.appendChild(g);
        }
        document.body.appendChild(ghostWrapper);
      }

      // 5. AFTER PAINT: animate everything smoothly
      requestAnimationFrame(() => {
        // Animate matched tokens from old → new position
        spans.forEach((span) => {
          const key = span.dataset.mk!;
          const old = oldSnap.get(key);
          const line = lineMap.get(span) ?? 0;
          const lineDelay = Math.min(line * LINE_STAGGER, DUR * 0.35);

          if (old) {
            const cur = newSnap.get(key)!;
            const dx = old.left - cur.left;
            const dy = old.top - cur.top;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
              span.style.transform = "";
              span.animate(
                [
                  { transform: `translate(${dx}px,${dy}px)`, offset: 0 },
                  { transform: "translate(0,0)", offset: 1 },
                ],
                { duration: DUR, delay: lineDelay, easing: MOVE_EASING, fill: "both" }
              );
            }
          } else {
            // Animate new tokens in
            span.style.opacity = "";
            span.animate(
              [
                { opacity: 0 },
                { opacity: 1 },
              ],
              {
                duration: DUR * 0.8,
                delay: DUR * 0.2 + lineDelay,
                easing: FADE_IN_EASING,
                fill: "backwards",
              }
            );
          }
        });

        // Animate ghosts out
        if (ghostWrapper) {
          ghostWrapper.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: DUR * 0.6, easing: FADE_OUT_EASING }
          ).onfinish = () => ghostWrapper.remove();
        }
      });
    }

    snapshotRef.current = newSnap;
  }, [lines]);

  return (
    <pre
      ref={preRef}
      style={{ margin: 0, padding: 0, background: "transparent", color: fg, fontFamily: "Menlo, Monaco, 'Courier New', monospace", fontSize: "15px", lineHeight: 1.6, fontVariantLigatures: "none", tabSize: 2 }}
    >
      <code>
        {lines.map((line, li) => (
          <span key={li}>
            {line.map((t) => (
              <span key={t.matchKey} data-mk={t.matchKey} style={{ color: t.color }}>
                {t.content}
              </span>
            ))}
            {li < lines.length - 1 ? "\n" : null}
          </span>
        ))}
      </code>
    </pre>
  );
}
