"use client";

import { useRef, useCallback } from "react";
import type { CodeSlide } from "@/types";
import { LANG_LIST } from "@/hooks/use-highlighter";
import { ShikiCodeBlock } from "./shiki-code-block";

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
    <div className="flex h-full flex-col gap-3">
      <input
        type="text"
        value={slide.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="Slide title (optional)"
        className="rounded-md border border-zinc-700 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500"
      />

      <select
        value={slide.language}
        onChange={(e) => onChange({ language: e.target.value })}
        className="w-48 rounded-md border border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
      >
        {LANG_LIST.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>

      {/* Overlay code editor: highlighted code underneath, transparent textarea on top */}
      <div className="relative flex-1 overflow-hidden rounded-md border border-zinc-700 bg-zinc-950">
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
          className="absolute inset-0 resize-none bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-transparent caret-zinc-100 outline-none selection:bg-blue-500/30"
          placeholder="Paste your code here…"
        />
      </div>
    </div>
  );
}
