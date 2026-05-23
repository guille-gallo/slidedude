"use client";

import { useState, useEffect } from "react";
import type { MermaidSlide } from "@/types";
import { MermaidDiagram } from "./mermaid-diagram";
import { ChevronDown, Workflow, StickyNote } from "lucide-react";
import { NotesPanel } from "@/components/notes-panel";
import { TITLE_FONT_SIZE_DEFAULT, TITLE_FONT_SIZE_PRESETS } from "@/lib/constants";

interface MermaidSlideEditorProps {
  slide: MermaidSlide;
  onChange: (patch: Partial<MermaidSlide>) => void;
  showNotes: boolean;
  onToggleNotes: () => void;
}

export function MermaidSlideEditor({ slide, onChange, showNotes, onToggleNotes }: MermaidSlideEditorProps) {
  const titleFontSize = slide.titleFontSize ?? TITLE_FONT_SIZE_DEFAULT;
  // Debounce source changes for the live preview to keep typing smooth.
  const [previewSource, setPreviewSource] = useState(slide.source);
  useEffect(() => {
    const t = setTimeout(() => setPreviewSource(slide.source), 250);
    return () => clearTimeout(t);
  }, [slide.source]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
      {/* Title + section row */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-md bg-sky-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-sky-400">
          <Workflow className="h-3 w-3" /> Diagram
        </div>
        <input
          type="text"
          value={slide.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Slide title"
          style={{ fontSize: `${titleFontSize}px` }}
          className="input-glow flex-1 rounded-lg border border-[--border] bg-white/[0.02] px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none transition-all focus:border-[--accent] focus:bg-white/[0.04]"
        />
        <div className="relative">
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <select
            aria-label="Title size"
            value={titleFontSize}
            onChange={(e) => onChange({ titleFontSize: Number(e.target.value) })}
            className="input-glow w-20 cursor-pointer appearance-none rounded-lg border border-[--border] bg-white/[0.02] py-2 pl-3 pr-8 text-xs text-zinc-300 outline-none transition-all focus:border-[--accent] focus:bg-white/[0.04]"
          >
            {TITLE_FONT_SIZE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          value={slide.section ?? ""}
          onChange={(e) => onChange({ section: e.target.value || undefined })}
          placeholder="Section (optional)"
          className="input-glow w-44 rounded-lg border border-[--border] bg-white/[0.02] px-3 py-2 text-xs text-zinc-400 placeholder-zinc-600 outline-none transition-all focus:border-[--accent] focus:bg-white/[0.04]"
        />
      </div>

      {/* Source + preview */}
      <div className="grid flex-1 min-h-0 grid-cols-2 gap-3">
        <textarea
          value={slide.source}
          onChange={(e) => onChange({ source: e.target.value })}
          spellCheck={false}
          className="input-glow h-full resize-none rounded-lg border border-[--border] bg-[#0a0a0a] p-3 font-mono text-sm leading-relaxed text-zinc-300 outline-none transition-all focus:border-[--accent]"
          placeholder={"flowchart TB\n  A --> B"}
        />
        <div className="flex h-full items-center justify-center overflow-auto rounded-lg border border-[--border] bg-[#0a0a0a] p-4">
          <MermaidDiagram source={previewSource} theme="dark" className="h-full w-full" />
        </div>
      </div>

      </div>

      {/* Notes */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={onToggleNotes}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors ${
            showNotes ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          <StickyNote className="h-3.5 w-3.5" />
          Presenter Notes
        </button>
      </div>
      <NotesPanel
        open={showNotes}
        value={slide.notes ?? ""}
        onChange={(v) => onChange({ notes: v })}
        placeholder="Speaker notes…"
      />
    </div>
  );
}
