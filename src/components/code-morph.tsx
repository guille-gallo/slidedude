"use client";

import { useRef, useLayoutEffect, useMemo } from "react";
import type { HighlighterCore } from "shiki";
import {
  springTranslateKeyframes,
  springEnterKeyframes,
  springExitKeyframes,
  SPRING_PRESETS,
} from "@/utils/spring";

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

/* ── Tuning knobs ─────────────────────────────────────────── */
const MAX_GHOSTS = 80;
const LINE_STAGGER = 12;          // ms between each line's start
const ENTER_DELAY_FRAC = 0.15;    // new tokens wait this fraction of move duration before entering
const EXIT_OVERLAP = 0.85;        // ghosts start fading while move is at this % of its duration

/* ── Pre-compute reusable entrance/exit keyframes ──────────── */
const ENTER_KF = springEnterKeyframes(SPRING_PRESETS.gentle);
const EXIT_KF = springExitKeyframes(SPRING_PRESETS.smooth);

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

      // Also compute ghost line indices for stagger
      const ghostLineIndices = new Map<string, number>();
      {
        let gLastTop = -Infinity;
        let gLineIdx = -1;
        const sortedGhosts = [...oldSnap.entries()]
          .filter(([key]) => !alive.has(key))
          .sort(([, a], [, b]) => a.top - b.top || a.left - b.left);
        for (const [key, snap] of sortedGhosts) {
          if (snap.top - gLastTop > 2) { gLineIdx++; gLastTop = snap.top; }
          ghostLineIndices.set(key, gLineIdx);
        }
      }

      // Track all animations so we can clean up
      const animations: Animation[] = [];

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
          span.style.transform = "scale(0.92)";
        }
      });

      // 4. Create ghosts for removed tokens BEFORE paint
      let ghostWrapper: HTMLDivElement | null = null;
      const ghostKeys: string[] = [];
      oldSnap.forEach((_, key) => {
        if (!alive.has(key)) ghostKeys.push(key);
      });

      const ghostElements: { el: HTMLSpanElement; key: string }[] = [];
      if (ghostKeys.length > 0) {
        const cs = getComputedStyle(pre);
        ghostWrapper = document.createElement("div");
        ghostWrapper.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999";
        const count = Math.min(ghostKeys.length, MAX_GHOSTS);
        for (let i = 0; i < count; i++) {
          const key = ghostKeys[i];
          const saved = oldSnap.get(key)!;
          const g = document.createElement("span");
          g.textContent = saved.content;
          g.style.cssText = `position:absolute;left:${saved.left}px;top:${saved.top}px;color:${saved.color};white-space:pre;font-family:${cs.fontFamily};font-size:${cs.fontSize};line-height:${cs.lineHeight};transform-origin:center center`;
          ghostWrapper.appendChild(g);
          ghostElements.push({ el: g, key });
        }
        document.body.appendChild(ghostWrapper);
      }

      // 5. AFTER PAINT: animate everything with spring physics
      requestAnimationFrame(() => {
        // --- Compute the longest move duration for phase coordination ---
        let maxMoveDur = 0;

        // Animate matched tokens from old → new position using spring keyframes
        spans.forEach((span) => {
          const key = span.dataset.mk!;
          const old = oldSnap.get(key);
          const line = lineMap.get(span) ?? 0;
          const lineDelay = line * LINE_STAGGER;

          if (old) {
            const cur = newSnap.get(key)!;
            const dx = old.left - cur.left;
            const dy = old.top - cur.top;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
              span.style.transform = "";
              // Generate spring keyframes unique to this displacement
              const { keyframes, duration } = springTranslateKeyframes(
                dx, dy, SPRING_PRESETS.snappy
              );
              maxMoveDur = Math.max(maxMoveDur, duration + lineDelay);
              const anim = span.animate(keyframes, {
                duration,
                delay: lineDelay,
                fill: "both",
                easing: "linear", // easing baked into keyframes
              });
              animations.push(anim);
            }
          }
        });

        // If no moves, use a sensible default for phase timing
        if (maxMoveDur === 0) maxMoveDur = ENTER_KF.duration;

        // Animate new tokens in with spring entrance (staggered, delayed)
        spans.forEach((span) => {
          const key = span.dataset.mk!;
          const old = oldSnap.get(key);

          if (!old) {
            const line = lineMap.get(span) ?? 0;
            const lineDelay = line * LINE_STAGGER;
            const enterDelay = maxMoveDur * ENTER_DELAY_FRAC + lineDelay;

            span.style.opacity = "";
            span.style.transform = "";
            const anim = span.animate(ENTER_KF.keyframes, {
              duration: ENTER_KF.duration,
              delay: enterDelay,
              fill: "backwards",
              easing: "linear",
            });
            animations.push(anim);
          }
        });

        // Animate ghosts out with spring exit (per-ghost stagger)
        if (ghostWrapper) {
          ghostElements.forEach(({ el, key }) => {
            const gLine = ghostLineIndices.get(key) ?? 0;
            const ghostDelay = gLine * LINE_STAGGER;
            const anim = el.animate(EXIT_KF.keyframes, {
              duration: EXIT_KF.duration,
              delay: ghostDelay,
              fill: "forwards",
              easing: "linear",
            });
            animations.push(anim);
          });

          // Clean up ghost wrapper after all ghost animations finish
          const totalGhostDur = EXIT_KF.duration +
            (ghostElements.length > 0
              ? (ghostLineIndices.get(ghostElements[ghostElements.length - 1].key) ?? 0) * LINE_STAGGER
              : 0);
          setTimeout(() => ghostWrapper?.remove(), totalGhostDur + 50);
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
