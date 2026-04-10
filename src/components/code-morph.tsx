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

/* ── Tuning ───────────────────────────────────────────────── */
const DURATION = 1000;             // ms
const EASING = "cubic-bezier(0.22, 0.1, 0.0, 1.0)"; // strong ease-out: slow landing
const MAX_GHOSTS = 80;

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
      // BEFORE PAINT: position matched tokens at old spot, hide new ones
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
          span.style.transform = "translateY(0.25em)";
        }
      });

      // 4. Create ghosts for removed tokens BEFORE paint
      let ghostWrapper: HTMLDivElement | null = null;
      const ghostKeys: string[] = [];
      oldSnap.forEach((_, key) => {
        if (!alive.has(key)) ghostKeys.push(key);
      });

      const ghostElements: HTMLSpanElement[] = [];
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
          ghostElements.push(g);
        }
        document.body.appendChild(ghostWrapper);
      }

      // AFTER PAINT: animate everything simultaneously
      requestAnimationFrame(() => {
        spans.forEach((span) => {
          const key = span.dataset.mk!;
          const old = oldSnap.get(key);

          if (old) {
            const cur = newSnap.get(key)!;
            const dx = old.left - cur.left;
            const dy = old.top - cur.top;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
              span.style.transform = "";
              span.animate(
                [
                  { transform: `translate(${dx}px,${dy}px)` },
                  { transform: "translate(0,0)" },
                ],
                { duration: DURATION, easing: EASING, fill: "both" }
              );
            }
          } else {
            span.style.opacity = "";
            span.style.transform = "";
            span.animate(
              [
                { opacity: 0, transform: "translateY(0.25em)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              { duration: DURATION, easing: EASING, fill: "backwards" }
            );
          }
        });

        if (ghostWrapper) {
          ghostElements.forEach((el) => {
            el.animate(
              [
                { opacity: 1, transform: "translateY(0)" },
                { opacity: 0, transform: "translateY(-0.25em)" },
              ],
              { duration: DURATION, easing: EASING, fill: "forwards" }
            );
          });
          setTimeout(() => ghostWrapper?.remove(), DURATION + 100);
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
