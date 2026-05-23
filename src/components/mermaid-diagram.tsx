"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  source: string;
  /** "dark" or "default" — passed through to mermaid.initialize. */
  theme?: "dark" | "default" | "neutral" | "forest";
  /** Called once a successful render produces SVG (used by /present?print=1). */
  onReady?: () => void;
  className?: string;
}

let initialized = false;
let initializedTheme: string | null = null;

let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => m.default);
  }
  return mermaidPromise;
}

/** Render a Mermaid source string to inert SVG. Lazy-loads the mermaid bundle.
 *  Falls back to a `<pre>` of the source plus the parser error if rendering fails. */
export function MermaidDiagram({ source, theme = "dark", onReady, className }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const renderId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const id = ++renderId.current;

    (async () => {
      try {
        const mermaid = await loadMermaid();
        if (!initialized || initializedTheme !== theme) {
          mermaid.initialize({
            startOnLoad: false,
            theme,
            securityLevel: "strict",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            themeVariables: {
              background: "transparent",
              clusterBkg: "transparent",
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
              fontSize: "22px",
            },
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
              nodeSpacing: 40,
              rankSpacing: 50,
            },
          });
          initialized = true;
          initializedTheme = theme;
        }

        // Validate first so we can show a clean error instead of throwing.
        await mermaid.parse(source);
        const { svg } = await mermaid.render(`mermaid-${id}-${Math.random().toString(36).slice(2)}`, source);

        if (cancelled || id !== renderId.current) return;
        if (ref.current) {
          ref.current.innerHTML = svg;
          const svgEl = ref.current.querySelector("svg");
          if (svgEl) {
            // Make the SVG fluidly fill its container.
            svgEl.removeAttribute("width");
            svgEl.removeAttribute("height");
            svgEl.style.width = "100%";
            svgEl.style.height = "100%";
            svgEl.style.maxHeight = "100%";
            svgEl.style.background = "transparent";
            svgEl.setAttribute("preserveAspectRatio", "xMidYMid meet");
            // Mermaid sometimes injects a full-size background <rect> — strip its fill.
            svgEl.querySelectorAll("rect.background, .cluster-bkg").forEach((el) => {
              (el as SVGElement).setAttribute("fill", "transparent");
              (el as SVGElement).setAttribute("stroke", "none");
            });
          }
        }
        setError(null);
        onReady?.();
      } catch (e: unknown) {
        if (cancelled || id !== renderId.current) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        if (ref.current) ref.current.innerHTML = "";
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [source, theme, onReady]);

  return (
    <div className={className}>
      <div
        ref={ref}
        className="flex h-full w-full items-center justify-center"
        aria-hidden={!!error}
      />
      {error && (
        <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-left text-xs text-red-300">
          <div className="mb-1 font-mono font-semibold">Mermaid render error</div>
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-red-200/80">{error}</pre>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-2 font-mono text-[11px] text-zinc-300">{source}</pre>
        </div>
      )}
    </div>
  );
}
