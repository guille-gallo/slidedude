"use client";

import { useEffect, useRef } from "react";
import { BookOpen, CheckCircle2, LayoutTemplate, MonitorDown, Play, Sparkles, X } from "lucide-react";
import { PRESENTATION_TEMPLATES } from "@/lib/templates";

interface LearnDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreateTutorial: () => void;
  onCreateTemplate: (templateId: string) => void;
  onOfflineExport: () => void;
}

const quickSteps = [
  "Open the tutorial deck",
  "Try a code change",
  "Add a diagram or content slide",
  "Write presenter notes",
  "Present, then export",
];

const capabilityGroups = [
  {
    title: "Animated code walkthroughs",
    description: "Use consecutive code slides to make changes move between states.",
  },
  {
    title: "Content slides with images",
    description: "Mix narrative slides with pasted or uploaded images.",
  },
  {
    title: "Mermaid diagrams",
    description: "Render flowcharts, sequences, and architecture diagrams from text.",
  },
  {
    title: "Sections and presenter notes",
    description: "Group the talk with sections and keep private speaker notes in the editor.",
  },
  {
    title: "PDF and JSON exports",
    description: "Share printable decks or keep a portable backup file.",
  },
];

export function LearnDrawer({
  open,
  onClose,
  onCreateTutorial,
  onCreateTemplate,
  onOfflineExport,
}: LearnDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close learn drawer"
        className="absolute inset-0 h-full w-full bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="learn-drawer-title"
        className="absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col border-l border-[--border-bright] bg-[--surface] shadow-2xl shadow-black/50"
      >
        <header className="flex items-center justify-between border-b border-[--border] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <h2 id="learn-drawer-title" className="text-sm font-semibold text-white">
                Learn slidedude
              </h2>
              <p className="text-xs font-medium text-zinc-300">Tutorial deck, templates, and a quick capability map.</p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
            aria-label="Close learn drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <section className="border-b border-[--border] pb-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              Start here
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              Create and switch to a ready-made tutorial presentation. Your current deck stays intact.
            </p>
            <button
              type="button"
              onClick={onCreateTutorial}
              className="mt-4 flex w-full items-center justify-between rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-left text-sm font-medium text-emerald-300 transition-all hover:border-emerald-500/45 hover:bg-emerald-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
            >
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Open tutorial deck
              </span>
              <span className="font-mono text-[11px] text-emerald-500/80">7 slides</span>
            </button>
          </section>

          <section className="border-b border-[--border] py-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              First pass
            </div>
            <ul className="mt-3 space-y-2">
              {quickSteps.map((step) => (
                <li key={step} className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {step}
                </li>
              ))}
            </ul>
          </section>

          <section className="border-b border-[--border] py-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              <LayoutTemplate className="h-3.5 w-3.5" />
              Starter templates
            </div>
            <div className="mt-3 space-y-2">
              {PRESENTATION_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onCreateTemplate(template.id)}
                  className="w-full rounded-md border border-[--border] bg-white/[0.02] px-3 py-3 text-left transition-all hover:border-[--border-bright] hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-zinc-200">{template.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-zinc-400">{template.slides.length} slides</span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-300">{template.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="py-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              <MonitorDown className="h-3.5 w-3.5" />
              Offline
            </div>
            <div className="mt-3 rounded-md border border-sky-500/20 bg-sky-500/10 px-3 py-3">
              <p className="text-sm font-medium text-sky-200">Standalone HTML export</p>
              <p className="mt-1 text-xs leading-5 text-sky-100/75">
                Download a self-contained copy for conference laptops, weak Wi-Fi, or talks where auth should not be required.
              </p>
              <button
                type="button"
                onClick={onOfflineExport}
                className="mt-3 flex items-center gap-2 rounded-md border border-sky-400/25 bg-sky-400/10 px-3 py-2 text-xs font-medium text-sky-100 transition-all hover:border-sky-300/45 hover:bg-sky-400/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
              >
                <MonitorDown className="h-3.5 w-3.5" />
                Download current deck
              </button>
            </div>
          </section>

          <section className="py-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              <BookOpen className="h-3.5 w-3.5" />
              Capability map
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {capabilityGroups.map((item) => (
                <div key={item.title} className="rounded-md border border-[--border] bg-white/[0.015] px-3 py-2">
                  <p className="text-sm font-medium text-zinc-300">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-300">{item.description}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
