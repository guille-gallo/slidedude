"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import type { Slide } from "@/types";
import { useHighlighter } from "@/hooks/use-highlighter";
import { CodeMorph } from "./code-morph";
import Image from "next/image";

interface PresentationModeProps {
  slides: Slide[];
  initialIndex: number;
  onExit: () => void;
}

export function PresentationMode({
  slides,
  initialIndex,
  onExit,
}: PresentationModeProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const highlighter = useHighlighter();

  const currentSlide = slides[currentIndex];

  const navigating = useRef(false);

  const next = useCallback(() => {
    if (navigating.current) return;
    const nextIdx = Math.min(currentIndex + 1, slides.length - 1);
    if (nextIdx === currentIndex) return;
    navigating.current = true;
    setTimeout(() => {
      setCurrentIndex(nextIdx);
      navigating.current = false;
    }, 300);
  }, [currentIndex, slides.length]);

  const prev = useCallback(() => {
    if (navigating.current) return;
    const prevIdx = Math.max(currentIndex - 1, 0);
    if (prevIdx === currentIndex) return;
    navigating.current = true;
    setTimeout(() => {
      setCurrentIndex(prevIdx);
      navigating.current = false;
    }, 300);
  }, [currentIndex]);

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
        onExit();
      }
    },
    [next, prev, onExit],
  );

  if (!currentSlide) return null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex flex-col bg-[#000] outline-none"
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
              <div className="w-full min-h-0 overflow-auto p-6">
                {highlighter ? (
                  <CodeMorph
                    highlighter={highlighter}
                    code={currentSlide.code}
                    lang={currentSlide.language}
                    theme={currentSlide.theme}
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
