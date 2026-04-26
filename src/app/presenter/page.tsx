"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { usePresentationStore } from "@/store/presentation-store";
import { findSection } from "@/lib/sections";

function useHydration() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (usePresentationStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = usePresentationStore.persist.onFinishHydration(() => setHydrated(true));
    void usePresentationStore.persist.rehydrate();
    return unsub;
  }, []);
  return hydrated;
}

export default function PresenterPage() {
  const hydrated = useHydration();
  const presentation = usePresentationStore((s) => {
    const id = s.activePresentationId;
    return s.presentations.find((p) => p.id === id);
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());

  // Listen to BroadcastChannel for slide changes
  useEffect(() => {
    const channel = new BroadcastChannel("slidedude-presenter");
    channel.onmessage = (e) => {
      if (e.data?.type === "slide-change" && typeof e.data.index === "number") {
        setCurrentIndex(e.data.index);
      }
    };
    return () => channel.close();
  }, []);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const slides = presentation?.slides ?? [];
  const sectionInfo = useMemo(
    () => (presentation ? findSection(slides, currentIndex) : null),
    [presentation, slides, currentIndex],
  );

  if (!hydrated || !presentation) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505] text-zinc-500">
        Waiting for presentation…
      </div>
    );
  }

  const currentSlide = slides[currentIndex];
  const nextSlide = slides[currentIndex + 1];

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const slideTypeLabel = (t: string) =>
    t === "code" ? "Code slide" : t === "mermaid" ? "Diagram slide" : "Content slide";

  return (
    <div className="flex h-screen flex-col bg-[#050505] text-zinc-300">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-6 py-3">
        <h1 className="font-mono text-sm text-zinc-500">
          slidedude<span className="text-emerald-400">_</span> presenter
        </h1>
        <div className="flex items-center gap-6">
          {sectionInfo?.section.name && (
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">
              {sectionInfo.section.name}
              <span className="ml-2 text-zinc-700">
                {sectionInfo.indexInSection + 1} / {sectionInfo.section.size}
              </span>
            </span>
          )}
          <span className="font-mono text-3xl tabular-nums text-zinc-400">{timeStr}</span>
          <span className="rounded-md bg-white/[0.04] px-3 py-1 text-sm text-zinc-500">
            {currentIndex + 1} / {slides.length}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Notes panel */}
        <div className="flex flex-1 flex-col overflow-auto p-8">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-600">
            {currentSlide?.title || `Slide ${currentIndex + 1}`}
          </div>
          <div className="flex-1 whitespace-pre-wrap text-lg leading-relaxed text-zinc-300">
            {currentSlide?.notes || (
              <span className="italic text-zinc-600">No notes for this slide</span>
            )}
          </div>
        </div>

        {/* Next slide panel */}
        <div className="flex w-72 shrink-0 flex-col border-l border-white/[0.06] p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-600">
            Up next
          </div>
          {nextSlide ? (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-sm font-medium text-zinc-300">
                {nextSlide.title || "Untitled"}
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                {slideTypeLabel(nextSlide.type)}
              </div>
              {nextSlide.section && (
                <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  {nextSlide.section}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm italic text-zinc-600">End of presentation</div>
          )}
        </div>
      </div>
    </div>
  );
}
