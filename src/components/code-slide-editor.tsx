"use client";

import { useRef, useCallback } from "react";
import type { CodeSlide } from "@/types";
import { LANG_LIST } from "@/hooks/use-highlighter";
import { ShikiCodeBlock } from "./shiki-code-block";

import { Code2, ChevronDown } from "lucide-react";

interface CodeSlideEditorProps {
  slide: CodeSlide;
  onChange: (patch: Partial<CodeSlide>) => void;
}

export function CodeSlideEditor({ slide, onChange }: CodeSlideEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
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
        {/* Line numbers gutter effect via top-left gradient */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white/[0.02] to-transparent" />
        {/* Syntax-highlighted layer */}
        <div
          ref={highlightRef}
          aria-hidden
          className="shiki-overlay-editor pointer-events-none absolute inset-0 overflow-hidden px-4 py-3 font-mono text-sm leading-relaxed"
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
          className="absolute inset-0 resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-transparent caret-emerald-400 outline-none selection:bg-emerald-500/15"
          placeholder="Paste your code here…"
        />
      </div>
    </div>
  );
}
