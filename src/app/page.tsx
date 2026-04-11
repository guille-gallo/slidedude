"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { usePresentationStore } from "@/store/presentation-store";
import { SlideList } from "@/components/slide-list";
import { CodeSlideEditor } from "@/components/code-slide-editor";
import { ContentSlideEditor } from "@/components/content-slide-editor";
import { PresentationMode } from "@/components/presentation-mode";
import { ErrorBoundary } from "@/components/error-boundary";
import { UserMenu } from "@/components/user-menu";
import { exportPresentation, importPresentation } from "@/utils/export-import";
import type { CodeSlide, ContentSlide } from "@/types";

/** Wait for Zustand persist to rehydrate from localStorage before rendering */
function useHydration() {
  const [hydrated, setHydrated] = useState(
    () => usePresentationStore.persist.hasHydrated()
  );
  useEffect(() => {
    const unsub = usePresentationStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
}

export default function Home() {
  const hydrated = useHydration();
  const store = usePresentationStore();
  const presentation = store.getActivePresentation();
  const activeSlide = store.getActiveSlide();
  const [showPresentation, setShowPresentation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from server on mount
  useEffect(() => {
    if (hydrated) {
      store.loadFromServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

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
      if (e.key === "d" && (e.ctrlKey || e.metaKey) && !isInput) {
        e.preventDefault();
        if (presentation) {
          store.duplicateSlide(presentation.activeSlideIndex);
        }
      }
      if (e.key === "Delete" && !isInput) {
        e.preventDefault();
        if (presentation && window.confirm("Delete this slide?")) {
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

  const handleExport = useCallback(() => {
    if (presentation) exportPresentation(presentation);
  }, [presentation]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = importPresentation(reader.result as string);
        if (result) {
          store.importPresentation(result);
        } else {
          alert("Invalid .slidedude.json file");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [store]
  );

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
      <ErrorBoundary>
        <PresentationMode
          slides={presentation.slides}
          initialIndex={presentation.activeSlideIndex}
          onExit={handleExitPresentation}
        />
      </ErrorBoundary>
    );
  }

  const syncDot =
    store.syncStatus === "saved"
      ? "bg-green-500"
      : store.syncStatus === "saving"
        ? "bg-yellow-500"
        : store.syncStatus === "error"
          ? "bg-red-500"
          : "bg-zinc-600";

  const syncLabel =
    store.syncStatus === "saved"
      ? "Saved"
      : store.syncStatus === "saving"
        ? "Saving…"
        : store.syncStatus === "error"
          ? "Offline"
          : "";

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {store.storageWarning && (
        <div className="bg-amber-600 px-4 py-1.5 text-center text-xs font-medium text-white">
          Local storage is full. Your data is synced to the cloud, but local backup may be incomplete.
        </div>
      )}

      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold tracking-tight">slidedude</h1>
          <input
            type="text"
            value={presentation.name}
            onChange={(e) => store.renamePresentation(presentation.id, e.target.value)}
            className="rounded border border-transparent bg-transparent px-2 py-0.5 text-sm text-zinc-400 outline-none hover:border-zinc-700 focus:border-blue-500"
          />
          {syncLabel && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className={`inline-block h-2 w-2 rounded-full ${syncDot}`} />
              {syncLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="rounded px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            title="Export presentation"
          >
            ↓ Export
          </button>
          <button
            onClick={handleImport}
            className="rounded px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            title="Import presentation"
          >
            ↑ Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => setShowPresentation(true)}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            ▶ Present
          </button>
          <UserMenu />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 border-r border-zinc-800">
          <SlideList
            slides={presentation.slides}
            activeIndex={presentation.activeSlideIndex}
            onSelect={(index) => store.setActiveSlideIndex(index)}
            onReorder={(from, to) => store.reorderSlide(from, to)}
            onAddSlide={(type) => store.addSlide(type)}
            onRemoveSlide={(index) => store.removeSlide(index)}
            onDuplicateSlide={(index) => store.duplicateSlide(index)}
          />
        </aside>

        {/* Editor */}
        <main className="flex-1 overflow-auto bg-sidebar p-4">
          <ErrorBoundary>
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
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
