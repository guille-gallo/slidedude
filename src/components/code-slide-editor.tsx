"use client";

import { useRef, useCallback, useState } from "react";
import type { CodeSlide } from "@/types";
import { LANG_LIST } from "@/hooks/use-highlighter";
import { ShikiCodeBlock } from "./shiki-code-block";

import { Code2, ChevronDown, StickyNote } from "lucide-react";

interface CodeSlideEditorProps {
  slide: CodeSlide;
  onChange: (patch: Partial<CodeSlide>) => void;
}

export function CodeSlideEditor({ slide, onChange }: CodeSlideEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [showNotes, setShowNotes] = useState(false);

  const lineCount = slide.code.split("\n").length;

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Controls bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={slide.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Slide title (optional)"
          className="input-glow flex-1 rounded-lg border border-[--border] bg-white/[0.02] px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none transition-all focus:border-[--accent] focus:bg-white/[0.04]"
        />

        <div className="relative">
          <Code2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <select
            value={slide.language}
            onChange={(e) => onChange({ language: e.target.value })}
            className="input-glow w-44 cursor-pointer appearance-none rounded-lg border border-[--border] bg-white/[0.02] py-2 pl-9 pr-8 font-mono text-xs text-zinc-300 outline-none transition-all focus:border-[--accent] focus:bg-white/[0.04]"
          >
            {LANG_LIST.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overlay code editor */}
      <div className="relative flex-1 overflow-hidden rounded-lg border border-[--border] bg-[#0a0a0a]">
        {/* Line numbers gutter */}
        <div
          ref={gutterRef}
          className="absolute inset-y-0 left-0 z-10 w-10 overflow-hidden border-r border-white/[0.06] bg-[#0a0a0a] py-3"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className="block w-full pr-2 text-right font-mono text-sm leading-relaxed text-zinc-700"
            >
              {i + 1}
            </div>
          ))}
        </div>
        {/* Syntax-highlighted layer */}
        <div
          ref={highlightRef}
          aria-hidden
          className="shiki-overlay-editor pointer-events-none absolute inset-0 overflow-hidden py-3 pl-12 pr-4 font-mono text-sm leading-relaxed"
        >
          <ShikiCodeBlock
            code={slide.code}
            lang={slide.language}
            theme="github-dark"
          />
        </div>
        {/* Editable textarea layer */}
        <textarea
          ref={textareaRef}
          value={slide.code}
          onChange={(e) => onChange({ code: e.target.value })}
          onScroll={handleScroll}
          spellCheck={false}
          className="absolute inset-0 resize-none bg-transparent py-3 pl-12 pr-4 font-mono text-sm leading-relaxed text-transparent caret-emerald-400 outline-none selection:bg-emerald-500/15"
          placeholder="Paste your code here…"
        />
      </div>

      {/* Notes toggle */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors ${
            showNotes ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-600 hover:text-zinc-400"
          }`}
        >
          <StickyNote className="h-3.5 w-3.5" />
          Presenter Notes
        </button>
        {showNotes && (
          <textarea
            value={slide.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value || undefined })}
            className="input-glow mt-2 w-full resize-none rounded-lg border border-[--border] bg-white/[0.02] px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none transition-all focus:border-[--accent] focus:bg-white/[0.04]"
            rows={3}
            placeholder="Speaker notes (visible only to you during presentation)…"
          />
        )}
      </div>
    </div>
  );
}
