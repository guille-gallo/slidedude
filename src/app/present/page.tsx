"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import type { Slide } from "@/types";
import { usePresentationStore } from "@/store/presentation-store";
import { useHighlighter } from "@/hooks/use-highlighter";
import { ShikiMagicMove } from "shiki-magic-move/react";
import "shiki-magic-move/dist/style.css";
import Image from "next/image";

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

  const currentSlide = slides[currentIndex];

  // BroadcastChannel — send index to presenter notes window
  useEffect(() => {
    channelRef.current = new BroadcastChannel("slidedude-presenter");
    return () => channelRef.current?.close();
  }, []);

  useEffect(() => {
    channelRef.current?.postMessage({ type: "slide-change", index: currentIndex });
  }, [currentIndex]);

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
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "Escape" || e.key === "F5") {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen?.().catch(() => {});
        }
      }
    },
    [next, prev],
  );

  // Enter fullscreen on mount
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  if (!currentSlide) return null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex h-screen flex-col bg-[#000] outline-none"
    >
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
        <button
          onClick={next}
          disabled={currentIndex === slides.length - 1}
          className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export default function PresentPage() {
  const hydrated = useHydration();
  const presentation = usePresentationStore((s) => {
    const id = s.activePresentationId;
    return s.presentations.find((p) => p.id === id);
  });

  if (!hydrated || !presentation) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#000] text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <PresentationView
      slides={presentation.slides}
      initialIndex={presentation.activeSlideIndex}
    />
  );
}
