"use client";

import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import type { Slide } from "@/types";
import { usePresentationStore } from "@/store/presentation-store";
import { useHighlighter } from "@/hooks/use-highlighter";
import { ShikiMagicMove } from "shiki-magic-move/react";
import "shiki-magic-move/dist/style.css";
import Image from "next/image";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { groupSections, findSection } from "@/lib/sections";

function useHydration() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (usePresentationStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      return usePresentationStore.persist.onFinishHydration(() => setHydrated(true));
    }
  }, []);
  return hydrated;
}

function PresentationView({ slides, initialIndex }: { slides: Slide[]; initialIndex: number }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const highlighter = useHighlighter();
  const animating = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [overview, setOverview] = useState(false);
  const [blackout, setBlackout] = useState(false);

  const currentSlide = slides[currentIndex];
  const sections = useMemo(() => groupSections(slides), [slides]);
  const sectionInfo = useMemo(() => findSection(slides, currentIndex), [slides, currentIndex]);

  // BroadcastChannel — send index to presenter notes window
  useEffect(() => {
    channelRef.current = new BroadcastChannel("slidedude-presenter");
    return () => channelRef.current?.close();
  }, []);

  useEffect(() => {
    channelRef.current?.postMessage({ type: "slide-change", index: currentIndex });
  }, [currentIndex]);

  // Mirror blackout to the presenter window so the speaker knows the audience sees black.
  useEffect(() => {
    channelRef.current?.postMessage({ type: "blackout", on: blackout });
  }, [blackout]);

  // Listen for commands from editor tab
  useEffect(() => {
    const channel = new BroadcastChannel("slidedude-control");
    channel.onmessage = (e) => {
      if (e.data?.type === "go-to-slide" && typeof e.data.index === "number") {
        setCurrentIndex(e.data.index);
      }
    };
    return () => channel.close();
  }, []);

  const next = useCallback(() => {
    if (animating.current) return;
    setCurrentIndex((i) => Math.min(i + 1, slides.length - 1));
  }, [slides.length]);

  const prev = useCallback(() => {
    if (animating.current) return;
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Blackout dismisses on any key.
      if (blackout) {
        e.preventDefault();
        setBlackout(false);
        return;
      }
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        if (overview) return;
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (overview) return;
        prev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        if (overview) {
          setOverview(false);
          return;
        }
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
      } else if (e.key === "F5") {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        } else {
          document.documentElement.requestFullscreen?.().catch(() => {});
        }
      } else if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        setOverview((v) => !v);
      } else if (e.key === "b" || e.key === "B" || e.key === ".") {
        e.preventDefault();
        setBlackout((v) => !v);
      }
    },
    [next, prev, overview, blackout],
  );

  if (!currentSlide) return null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative flex h-screen flex-col bg-[#000] outline-none"
    >
      {/* Section progress bar */}
      {sections.length > 0 && (
        <div className="flex shrink-0 gap-1 px-6 pt-3" aria-hidden="true">
          {sections.map((sec, i) => (
            <div
              key={`${sec.name ?? "_"}-${i}`}
              className="flex flex-1 gap-0.5"
              title={sec.name ?? ""}
            >
              {Array.from({ length: sec.size }, (_, j) => {
                const idx = sec.start + j;
                const active = idx <= currentIndex;
                const isCurrent = idx === currentIndex;
                return (
                  <div
                    key={idx}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      isCurrent
                        ? "bg-emerald-400"
                        : active
                          ? "bg-emerald-500/40"
                          : "bg-white/[0.06]"
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}

      {sectionInfo?.section.name && (
        <div className="shrink-0 px-6 pt-2 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-600">
          {sectionInfo.section.name}
        </div>
      )}

      <div className="flex flex-1 min-h-0 items-center justify-center overflow-hidden p-8">
        <div className="flex w-full max-w-5xl flex-col items-center gap-6 min-h-0 max-h-full">
          {currentSlide.type === "code" ? (
            <>
              {currentSlide.title && (
                <h1 className="text-3xl font-bold text-zinc-100 shrink-0">
                  {currentSlide.title}
                </h1>
              )}
              <div className="w-full min-h-0 overflow-hidden p-6">
                {highlighter ? (
                  <ShikiMagicMove
                    highlighter={highlighter}
                    code={currentSlide.code}
                    lang={currentSlide.language}
                    theme="github-dark"
                    options={{
                      duration: 800,
                      stagger: 0.3,
                      lineNumbers: false,
                      animateContainer: true,
                    }}
                    onStart={() => { animating.current = true; }}
                    onEnd={() => { animating.current = false; }}
                    className="magic-move-code"
                  />
                ) : (
                  <pre className="text-zinc-300">
                    <code>{currentSlide.code}</code>
                  </pre>
                )}
              </div>
            </>
          ) : currentSlide.type === "mermaid" ? (
            <>
              {currentSlide.title && (
                <h1 className="text-3xl font-bold text-zinc-100 shrink-0">
                  {currentSlide.title}
                </h1>
              )}
              <div className="flex w-full min-h-0 flex-1 items-center justify-center overflow-hidden">
                <MermaidDiagram source={currentSlide.source} theme="dark" className="h-full w-full" />
              </div>
            </>
          ) : (
            <>
              {currentSlide.title && (
                <h1
                  className="text-center font-bold text-zinc-100 shrink-0"
                  style={{ fontSize: `${currentSlide.fontSize}px` }}
                >
                  {currentSlide.title}
                </h1>
              )}
              {currentSlide.body && (
                <p className="max-w-2xl whitespace-pre-wrap text-center text-xl text-zinc-300">
                  {currentSlide.body}
                </p>
              )}
              {currentSlide.imageDataUrl && (
                <Image
                  src={currentSlide.imageDataUrl}
                  alt=""
                  width={800}
                  height={600}
                  className="max-h-[60vh] rounded-xl object-contain shadow-2xl"
                  unoptimized
                />
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between px-6 py-3">
        <button
          onClick={prev}
          disabled={currentIndex === 0}
          className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
        >
          ← Prev
        </button>
        <span className="text-sm text-zinc-500">
          {currentIndex + 1} / {slides.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOverview((v) => !v)}
            className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            title="Overview (G)"
            aria-label="Toggle overview"
          >
            ▦
          </button>
          <button
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen?.().catch(() => {});
              } else {
                document.documentElement.requestFullscreen?.().catch(() => {});
              }
            }}
            className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            title="Toggle fullscreen (F)"
          >
            ⛶
          </button>
          <button
            onClick={next}
            disabled={currentIndex === slides.length - 1}
            className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Overview grid (presenter-private aid; click a thumb to jump) */}
      {overview && (
        <div
          className="absolute inset-0 z-20 overflow-auto bg-black/95 p-8 backdrop-blur-sm"
          role="dialog"
          aria-label="Slide overview"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-sm uppercase tracking-widest text-zinc-500">Overview</h2>
            <span className="text-xs text-zinc-600">Esc or G to close · Enter to jump</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentIndex(i);
                  setOverview(false);
                }}
                className={`flex aspect-video flex-col items-start justify-between rounded-lg border p-3 text-left transition-all ${
                  i === currentIndex
                    ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_20px_-4px_rgba(52,211,153,0.4)]"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex w-full items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-600">{String(i + 1).padStart(2, "0")}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 uppercase tracking-wider ${
                      s.type === "code"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : s.type === "mermaid"
                          ? "bg-sky-500/10 text-sky-400"
                          : "bg-violet-500/10 text-violet-400"
                    }`}
                  >
                    {s.type === "mermaid" ? "diagram" : s.type}
                  </span>
                </div>
                <div className="line-clamp-3 w-full text-sm font-medium text-zinc-200">
                  {s.title || (s.type === "code" ? s.code.slice(0, 60) : s.type === "mermaid" ? s.source.split("\n")[0] : "Untitled")}
                </div>
                {s.section && (
                  <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-600">
                    {s.section}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Blackout — fully opaque overlay; press any key to dismiss */}
      {blackout && (
        <div
          className="absolute inset-0 z-30 bg-black"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export default function PresentPage() {
  const hydrated = useHydration();
  const presentation = usePresentationStore((s) => {
    const id = s.activePresentationId;
    return s.presentations.find((p) => p.id === id);
  });
  const [printMode, setPrintMode] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setPrintMode(params.get("print") === "1");
  }, []);

  if (!hydrated || !presentation) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#000] text-zinc-500">
        Loading…
      </div>
    );
  }

  if (printMode) {
    return <PrintView slides={presentation.slides} name={presentation.name} />;
  }

  return (
    <PresentationView
      slides={presentation.slides}
      initialIndex={presentation.activeSlideIndex}
    />
  );
}

function PrintView({ slides, name }: { slides: Slide[]; name: string }) {
  const highlighter = useHighlighter();
  const [mermaidReady, setMermaidReady] = useState(0);
  const printedRef = useRef(false);

  const mermaidSlides = useMemo(
    () => slides.filter((s) => s.type === "mermaid").length,
    [slides],
  );

  useEffect(() => {
    if (printedRef.current) return;
    if (!highlighter) return;
    if (mermaidReady < mermaidSlides) return;
    printedRef.current = true;
    // Small delay to let the layout settle (Magic Move/SVG measurement).
    const t = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(t);
  }, [highlighter, mermaidReady, mermaidSlides]);

  return (
    <div className="bg-white text-black print:bg-white">
      <style>{`
        @page { size: 1280px 720px; margin: 0; }
        @media print {
          html, body { background: white !important; }
        }
      `}</style>
      <div className="mb-2 px-6 py-3 text-xs text-zinc-500 print:hidden">
        Print preview · {name} · {slides.length} slides
      </div>
      {slides.map((slide, i) => (
        <section
          key={slide.id}
          className="slide-print relative flex h-[720px] w-[1280px] flex-col items-center justify-center overflow-hidden bg-[#000] p-10 text-zinc-100"
          style={{ pageBreakAfter: i < slides.length - 1 ? "always" : "auto", breakAfter: i < slides.length - 1 ? "page" : "auto" }}
        >
          {slide.section && (
            <div className="absolute left-10 top-6 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              {slide.section}
            </div>
          )}
          <div className="absolute right-10 top-6 font-mono text-[10px] text-zinc-600">
            {i + 1} / {slides.length}
          </div>
          {slide.type === "code" ? (
            <div className="flex w-full max-w-4xl flex-col items-center gap-6">
              {slide.title && <h2 className="text-3xl font-bold">{slide.title}</h2>}
              <pre className="w-full overflow-hidden rounded-lg bg-[#0d1117] p-6 font-mono text-sm leading-relaxed text-zinc-200">
                <code>{slide.code}</code>
              </pre>
            </div>
          ) : slide.type === "mermaid" ? (
            <div className="flex w-full max-w-4xl flex-col items-center gap-6">
              {slide.title && <h2 className="text-3xl font-bold">{slide.title}</h2>}
              <div className="flex h-[520px] w-full items-center justify-center">
                <MermaidDiagram
                  source={slide.source}
                  theme="dark"
                  onReady={() => setMermaidReady((n) => n + 1)}
                  className="h-full w-full"
                />
              </div>
            </div>
          ) : (
            <div className="flex w-full max-w-3xl flex-col items-center gap-6 text-center">
              {slide.title && (
                <h2 className="font-bold" style={{ fontSize: `${slide.fontSize}px` }}>
                  {slide.title}
                </h2>
              )}
              {slide.body && <p className="whitespace-pre-wrap text-xl text-zinc-300">{slide.body}</p>}
              {slide.imageDataUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={slide.imageDataUrl}
                  alt=""
                  className="max-h-[400px] rounded-lg object-contain"
                />
              )}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
