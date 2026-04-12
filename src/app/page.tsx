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
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Download, Upload, PlayIcon } from "lucide-react";

/** Wait for Zustand persist to rehydrate from localStorage before rendering.
 *  Always starts false to avoid SSR rendering store defaults that mismatch the client. */
function useHydration() {
  const [hydrated, setHydrated] = useState(() =>
    usePresentationStore.persist.hasHydrated()
  );
  useEffect(() => {
    if (!hydrated) {
      return usePresentationStore.persist.onFinishHydration(() => setHydrated(true));
    }
  }, [hydrated]);
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
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-center text-xs font-medium text-amber-400">
          Local storage is full. Your data is synced to the cloud, but local backup may be incomplete.
        </div>
      )}

      {/* Top bar — glassmorphic */}
      <header className="relative z-10 flex items-center justify-between border-b border-[--border] bg-[--surface]/80 px-5 py-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <h1 className="font-mono text-base font-semibold tracking-wide text-white">slidedude<span className="text-emerald-400">_</span></h1>
          <span className="h-4 w-px bg-[--border-bright]" />
          <input
            type="text"
            value={presentation.name}
            onChange={(e) => store.renamePresentation(presentation.id, e.target.value)}
            className="input-glow rounded-md border border-transparent bg-transparent px-2 py-0.5 text-sm text-zinc-400 outline-none transition-all hover:border-[--border-bright] focus:border-[--accent]"
          />
          {syncLabel && (
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${syncDot}`} />
              {syncLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 transition-all hover:bg-white/[0.04] hover:text-zinc-300"
            title="Export presentation"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-zinc-500 transition-all hover:bg-white/[0.04] hover:text-zinc-300"
            title="Import presentation"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <span className="mx-1 h-4 w-px bg-[--border-bright]" />
          <button
            onClick={() => setShowPresentation(true)}
            className="flex items-center gap-1.5 rounded-md bg-emerald-500 px-4 py-1.5 text-sm font-medium text-black shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/30 active:scale-[0.98]"
          >
            <PlayIcon className="h-3.5 w-3.5" /> Present
          </button>
          <UserMenu />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full w-full">
          {/* Sidebar Panel */}
          <Panel defaultSize={18} minSize={14} maxSize={28} className="flex h-full flex-col border-r border-[--border] bg-[--sidebar]">
            <SlideList
              slides={presentation.slides}
              activeIndex={presentation.activeSlideIndex}
              onSelect={(index) => store.setActiveSlideIndex(index)}
              onReorder={(from, to) => store.reorderSlide(from, to)}
              onAddSlide={(type) => store.addSlide(type)}
              onRemoveSlide={(index) => store.removeSlide(index)}
              onDuplicateSlide={(index) => store.duplicateSlide(index)}
            />
          </Panel>

          <PanelResizeHandle className="resize-handle relative w-[5px] bg-transparent" />

          {/* Editor Panel */}
          <Panel defaultSize={82} minSize={40} className="flex h-full flex-col bg-[--surface]">
            <main className="flex-1 overflow-auto p-5">
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
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
