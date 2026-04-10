"use client";

import { useEffect, useCallback, useState } from "react";
import { usePresentationStore } from "@/store/presentation-store";
import { SlideList } from "@/components/slide-list";
import { CodeSlideEditor } from "@/components/code-slide-editor";
import { ContentSlideEditor } from "@/components/content-slide-editor";
import { PresentationMode } from "@/components/presentation-mode";
import type { CodeSlide, ContentSlide } from "@/types";

/** Wait for Zustand persist to rehydrate from localStorage before rendering */
function useHydration() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // Zustand persist rehydrates synchronously on first render in the browser,
    // but we still need to wait one tick so the client state matches.
    const unsub = usePresentationStore.persist.onFinishHydration(() => setHydrated(true));
    // In case hydration already happened before this effect ran
    if (usePresentationStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}

function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("slido-dark-mode");
    const isDark = stored === "true";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("slido-dark-mode", String(next));
  };

  return (
    <button
      onClick={toggle}
      className="rounded-md border border-zinc-300 px-2 py-1 text-xs transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      title="Toggle dark mode"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}

export default function Home() {
  const hydrated = useHydration();
  const store = usePresentationStore();
  const presentation = store.getActivePresentation();
  const activeSlide = store.getActiveSlide();
  const [showPresentation, setShowPresentation] = useState(false);

  // Keyboard shortcuts (only when NOT in presentation mode)
  useEffect(() => {
    if (showPresentation) return;

    function handleKey(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "F5") {
        e.preventDefault();
        setShowPresentation(true);
      }
      if (e.key === "N" && e.shiftKey && !isInput) {
        e.preventDefault();
        store.addSlide("code");
      }
      if (e.key === "Delete" && !isInput) {
        e.preventDefault();
        if (presentation) {
          store.removeSlide(presentation.activeSlideIndex);
        }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [store, presentation, showPresentation]);

  const handleSlideUpdate = useCallback(
    (patch: Partial<CodeSlide> | Partial<ContentSlide>) => {
      if (!presentation) return;
      store.updateSlide(presentation.activeSlideIndex, patch);
    },
    [store, presentation]
  );

  const handleExitPresentation = useCallback(() => {
    setShowPresentation(false);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!presentation) return null;

  // When presenting, only render the presentation overlay — don't keep the
  // editor (with its own ShikiMagicMove instances) mounted in the background.
  if (showPresentation) {
    return (
      <PresentationMode
        slides={presentation.slides}
        initialIndex={presentation.activeSlideIndex}
        onExit={handleExitPresentation}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">slido.</h1>
          <input
            type="text"
            value={presentation.name}
            onChange={(e) => store.renamePresentaton(presentation.id, e.target.value)}
            className="rounded border border-transparent bg-transparent px-2 py-0.5 text-sm text-zinc-600 outline-none hover:border-zinc-300 focus:border-blue-500 dark:text-zinc-400 dark:hover:border-zinc-700"
          />
        </div>
        <div className="flex items-center gap-2">
          <DarkModeToggle />
          <button
            onClick={() => setShowPresentation(true)}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            ▶ Present
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800">
          <SlideList
            slides={presentation.slides}
            activeIndex={presentation.activeSlideIndex}
            onSelect={(index) => store.setActiveSlideIndex(index)}
            onReorder={(from, to) => store.reorderSlide(from, to)}
            onAddSlide={(type) => store.addSlide(type)}
            onRemoveSlide={(index) => store.removeSlide(index)}
          />
        </aside>

        {/* Editor */}
        <main className="flex-1 overflow-auto p-4">
          {activeSlide?.type === "code" && (
            <CodeSlideEditor
              slide={activeSlide}
              onChange={handleSlideUpdate}
            />
          )}
          {activeSlide?.type === "content" && (
            <ContentSlideEditor
              slide={activeSlide}
              onChange={handleSlideUpdate}
            />
          )}
        </main>
      </div>
    </div>
  );
}
