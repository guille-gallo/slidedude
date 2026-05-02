"use client";

import { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { usePresentationStore } from "@/store/presentation-store";
import { SlideList } from "@/components/slide-list";
import { CodeSlideEditor } from "@/components/code-slide-editor";
import { ContentSlideEditor } from "@/components/content-slide-editor";
import { MermaidSlideEditor } from "@/components/mermaid-slide-editor";
import { ErrorBoundary } from "@/components/error-boundary";
import { UserMenu } from "@/components/user-menu";
import { LearnDrawer } from "@/components/learn-drawer";
import { PresentationSwitcher } from "@/components/presentation-switcher";
import { exportPresentation, importPresentation } from "@/utils/export-import";
import { createPresentationFromTemplate, createTutorialPresentation } from "@/lib/templates";
import { CODE_PRESENTATION_MAX_LINES, getCodePresentationBlockers } from "@/lib/code-limits";
import { MAX_PRESENTATIONS } from "@/lib/validation";
import type { CodeSlide, ContentSlide, MermaidSlide } from "@/types";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { BookOpen, Download, Upload, PlayIcon, Printer, MonitorDown } from "lucide-react";

function Star() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 784.11 815.53" className="h-full w-full fill-emerald-300">
      <path d="M392.05 0c-20.9,210.08-184.06,378.41-392.05,407.78 207.96,29.37 371.12,197.68 392.05,407.74 20.93-210.06 184.09-378.37 392.05-407.74-207.98-29.38-371.16-197.69-392.06-407.78z" />
    </svg>
  );
}

/** Wait for Zustand persist to rehydrate from localStorage before rendering.
 *  Always starts false on the server to guarantee matching first render. */
function useHydration() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (usePresentationStore.persist.hasHydrated()) {
      queueMicrotask(() => setHydrated(true));
      return;
    }
    const unsub = usePresentationStore.persist.onFinishHydration(() => setHydrated(true));
    void usePresentationStore.persist.rehydrate();
    return unsub;
  }, []);
  return hydrated;
}

export default function Home() {
  const hydrated = useHydration();
  const store = usePresentationStore();
  const presentation = store.getActivePresentation();
  const activeSlide = store.getActiveSlide();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [learnOpen, setLearnOpen] = useState(false);
  const [serverLoaded, setServerLoaded] = useState(false);
  const presentationBlockers = useMemo(
    () => presentation ? getCodePresentationBlockers(presentation.slides) : [],
    [presentation],
  );
  const firstPresentationBlocker = presentationBlockers[0];
  const presentationBlockedMessage = firstPresentationBlocker
    ? `Slide ${firstPresentationBlocker.index + 1} (${firstPresentationBlocker.title}) reached the ${CODE_PRESENTATION_MAX_LINES}-line code limit. Split it into smaller code slides before presenting.`
    : "";
  const presentationIsBlocked = presentationBlockers.length > 0;

  const showPresentationBlocked = useCallback(() => {
    if (presentationBlockedMessage) alert(presentationBlockedMessage);
  }, [presentationBlockedMessage]);

  const openPresentation = useCallback((path: string) => {
    if (presentationIsBlocked) {
      showPresentationBlocked();
      return;
    }
    window.open(path, "_blank");
  }, [presentationIsBlocked, showPresentationBlocked]);

  // Load from server on mount
  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;
    void store.loadFromServer().finally(() => {
      if (!cancelled) setServerLoaded(true);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (!serverLoaded) return;
    try {
      if (localStorage.getItem("slidedude-learn-seen") !== "true") {
        setLearnOpen(true);
        localStorage.setItem("slidedude-learn-seen", "true");
      }
    } catch {
      // Ignore private browsing or storage failures; the drawer is still available.
    }
  }, [serverLoaded]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "F5") {
        e.preventDefault();
        openPresentation("/present");
      }
      if (e.key === "N" && e.shiftKey && !isInput) {
        e.preventDefault();
        store.addSlide("code");
      }
      if (e.key === "M" && e.shiftKey && !isInput) {
        e.preventDefault();
        store.addSlide("mermaid");
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
  }, [store, presentation, openPresentation]);

  const handleSlideUpdate = useCallback(
    (patch: Partial<CodeSlide> | Partial<ContentSlide> | Partial<MermaidSlide>) => {
      if (!presentation) return;
      store.updateSlide(presentation.activeSlideIndex, patch);
    },
    [store, presentation]
  );

  const handleExport = useCallback(() => {
    if (presentation) exportPresentation(presentation);
  }, [presentation]);

  const handleOfflineExport = useCallback(async () => {
    if (!presentation) return;
    if (presentationIsBlocked) {
      showPresentationBlocked();
      return;
    }
    const res = await fetch("/api/export/html", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presentation }),
    });
    if (!res.ok) {
      console.error("Offline export failed:", res.status, res.statusText);
      alert("Failed to generate offline export. Please try again.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const disposition = res.headers.get("content-disposition") ?? "";
    const match = disposition.match(/filename="([^"]+)"/);
    a.download = match ? match[1] : "presentation.html";
    a.click();
    URL.revokeObjectURL(url);
  }, [presentation, presentationIsBlocked, showPresentationBlocked]);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const showPresentationLimit = useCallback(() => {
    alert(`You can keep up to ${MAX_PRESENTATIONS} presentations. Delete one or export a backup before creating another.`);
  }, []);

  const handleCreateTutorial = useCallback(() => {
    if (!store.importPresentation(createTutorialPresentation())) {
      showPresentationLimit();
      return;
    }
    setLearnOpen(false);
  }, [store, showPresentationLimit]);

  const handleCreateTemplate = useCallback(
    (templateId: string) => {
      const templatePresentation = createPresentationFromTemplate(templateId);
      if (!templatePresentation) return;
      if (!store.importPresentation(templatePresentation)) {
        showPresentationLimit();
        return;
      }
      setLearnOpen(false);
    },
    [store, showPresentationLimit]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = importPresentation(reader.result as string);
        if (result) {
          if (!store.importPresentation(result)) {
            showPresentationLimit();
          }
        } else {
          alert("Invalid .slidedude.json file");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [store, showPresentationLimit]
  );

  // Render the editor shell optimistically using the store's default state.
  // Zustand persist will rehydrate from localStorage in an effect and the slide
  // content will swap in place — this lets LCP fire on the shell instead of
  // waiting ~2s for hydration. `presentation` is defined from initial state.
  if (!presentation) return null;

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
      <a
        href="#main-editor"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-emerald-500 focus:px-4 focus:py-2 focus:text-black"
      >
        Skip to editor
      </a>

      {store.storageWarning && (
        <div role="alert" className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-center text-xs font-medium text-amber-400">
          Local storage is full. Your data is synced to the cloud, but local backup may be incomplete.
        </div>
      )}

      {/* Top bar — glassmorphic */}
      <header className="relative z-20 flex items-center justify-between border-b border-[--border] bg-[--surface]/80 px-5 py-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <h1 className="font-mono text-base font-semibold tracking-wide text-white">slidedude<span className="text-emerald-400">_</span></h1>
          <span className="h-4 w-px bg-[--border-bright]" />
          <PresentationSwitcher
            presentations={store.presentations}
            activePresentationId={store.activePresentationId}
            onSelect={(id) => store.setActivePresentation(id)}
            onDelete={(id) => store.deletePresentation(id)}
            onDeleteAll={() => store.deleteAllPresentations()}
          />
          <input
            type="text"
            value={presentation.name}
            onChange={(e) => store.renamePresentation(presentation.id, e.target.value)}
            aria-label="Presentation name"
            className="input-glow rounded-md border border-transparent bg-transparent px-2 py-0.5 text-sm text-zinc-400 outline-none transition-all hover:border-[--border-bright] focus:border-[--accent]"
          />
          {syncLabel && (
            <span role="status" aria-live="polite" className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${syncDot}`} aria-hidden="true" />
              {syncLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLearnOpen(true)}
            className="flex items-center gap-1.5 rounded-md border border-[--border] bg-white/[0.02] px-2.5 py-1.5 text-xs text-zinc-400 transition-all hover:border-[--border-bright] hover:bg-white/[0.04] hover:text-zinc-200"
            title="Learn slidedude"
          >
            <BookOpen className="h-3.5 w-3.5" /> Learn
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md border border-[--border] bg-white/[0.02] px-2.5 py-1.5 text-xs text-zinc-400 transition-all hover:border-[--border-bright] hover:bg-white/[0.04] hover:text-zinc-200"
            title="Export presentation"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 rounded-md border border-[--border] bg-white/[0.02] px-2.5 py-1.5 text-xs text-zinc-400 transition-all hover:border-[--border-bright] hover:bg-white/[0.04] hover:text-zinc-200"
            title="Import presentation"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <button
            type="button"
            onClick={() => { if (!presentationIsBlocked) openPresentation("/present?print=1"); }}
            aria-disabled={presentationIsBlocked}
            className={`flex items-center gap-1.5 rounded-md border border-[--border] bg-white/[0.02] px-2.5 py-1.5 text-xs transition-all ${presentationIsBlocked ? "cursor-not-allowed text-zinc-500/70" : "text-zinc-400 hover:border-[--border-bright] hover:bg-white/[0.04] hover:text-zinc-200"}`}
            title={presentationIsBlocked ? presentationBlockedMessage : "Print to PDF"}
          >
            <Printer className="h-3.5 w-3.5" /> PDF
          </button>
          <button
            type="button"
            onClick={() => { if (!presentationIsBlocked) void handleOfflineExport(); }}
            aria-disabled={presentationIsBlocked}
            className={`flex items-center gap-1.5 rounded-md border border-[--border] bg-white/[0.02] px-2.5 py-1.5 text-xs transition-all ${presentationIsBlocked ? "cursor-not-allowed text-zinc-500/70" : "text-zinc-400 hover:border-[--border-bright] hover:bg-white/[0.04] hover:text-zinc-200"}`}
            title={presentationIsBlocked ? presentationBlockedMessage : "Download as offline HTML (works without internet)"}
          >
            <MonitorDown className="h-3.5 w-3.5" /> Offline
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Import presentation file"
          />
          <span className="mx-1 h-4 w-px bg-[--border-bright]" />
          <button
            onClick={() => { if (!presentationIsBlocked) openPresentation("/present"); }}
            aria-disabled={presentationIsBlocked}
            className={`group relative flex items-center gap-1.5 overflow-visible rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-300 ${presentationIsBlocked ? "cursor-not-allowed bg-emerald-500/20 text-emerald-200/60 shadow-none" : "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20 hover:bg-transparent hover:text-emerald-400 hover:shadow-[0_0_25px_rgba(52,211,153,0.35)] active:scale-95"}`}
            title={presentationIsBlocked ? presentationBlockedMessage : "Present"}
          >
            <PlayIcon className="h-3.5 w-3.5" /> Present
            {!presentationIsBlocked && (
              <>
                <div className="pointer-events-none absolute left-[20%] top-[20%] z-[-1] w-[14px] opacity-0 drop-shadow-[0_0_0_rgba(52,211,153,0)] transition-all duration-1000 ease-[cubic-bezier(0.05,0.83,0.43,0.96)] group-hover:left-[-10%] group-hover:top-[-40%] group-hover:z-[2] group-hover:opacity-100 group-hover:drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">
                  <Star />
                </div>
                <div className="pointer-events-none absolute left-[45%] top-[45%] z-[-1] w-[10px] opacity-0 drop-shadow-[0_0_0_rgba(52,211,153,0)] transition-all duration-1000 ease-[cubic-bezier(0,0.4,0,1.01)] group-hover:left-[15%] group-hover:top-[-15%] group-hover:z-[2] group-hover:opacity-100 group-hover:drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">
                  <Star />
                </div>
                <div className="pointer-events-none absolute left-[40%] top-[40%] z-[-1] w-[5px] opacity-0 drop-shadow-[0_0_0_rgba(52,211,153,0)] transition-all duration-1000 ease-[cubic-bezier(0,0.4,0,1.01)] group-hover:left-[30%] group-hover:top-[120%] group-hover:z-[2] group-hover:opacity-100 group-hover:drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">
                  <Star />
                </div>
                <div className="pointer-events-none absolute left-[40%] top-[20%] z-[-1] w-[6px] opacity-0 drop-shadow-[0_0_0_rgba(52,211,153,0)] transition-all duration-800 ease-[cubic-bezier(0,0.4,0,1.01)] group-hover:left-[85%] group-hover:top-[-20%] group-hover:z-[2] group-hover:opacity-100 group-hover:drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">
                  <Star />
                </div>
                <div className="pointer-events-none absolute left-[45%] top-[25%] z-[-1] w-[10px] opacity-0 drop-shadow-[0_0_0_rgba(52,211,153,0)] transition-all duration-600 ease-[cubic-bezier(0,0.4,0,1.01)] group-hover:left-[100%] group-hover:top-[30%] group-hover:z-[2] group-hover:opacity-100 group-hover:drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">
                  <Star />
                </div>
                <div className="pointer-events-none absolute left-[50%] top-[5%] z-[-1] w-[4px] opacity-0 drop-shadow-[0_0_0_rgba(52,211,153,0)] transition-all duration-800 ease-in-out group-hover:left-[70%] group-hover:top-[-30%] group-hover:z-[2] group-hover:opacity-100 group-hover:drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">
                  <Star />
                </div>
              </>
            )}
          </button>
          <UserMenu />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full w-full">
          {/* Sidebar Panel */}
          <Panel defaultSize={18} minSize={14} maxSize={28} className="flex h-full flex-col border-r border-[--border] bg-[--sidebar]" role="complementary" aria-label="Slide list">
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
            <main id="main-editor" className="flex-1 overflow-auto p-5">
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
                {activeSlide?.type === "mermaid" && (
                  <MermaidSlideEditor
                    slide={activeSlide}
                    onChange={handleSlideUpdate}
                  />
                )}
              </ErrorBoundary>
            </main>
          </Panel>
        </PanelGroup>
      </div>

      <LearnDrawer
        open={learnOpen}
        onClose={() => setLearnOpen(false)}
        onCreateTutorial={handleCreateTutorial}
        onCreateTemplate={handleCreateTemplate}
        onOfflineExport={handleOfflineExport}
      />
    </div>
  );
}
