"use client";

import type { CodeSlide } from "@/types";
import { LANG_LIST, THEME_LIST } from "@/hooks/use-highlighter";
import { ShikiCodeBlock } from "./shiki-code-block";

interface CodeSlideEditorProps {
  slide: CodeSlide;
  onChange: (patch: Partial<CodeSlide>) => void;
}

export function CodeSlideEditor({ slide, onChange }: CodeSlideEditorProps) {
  return (
    <div className="flex h-full gap-4">
      {/* Left: editor controls */}
      <div className="flex w-1/2 flex-col gap-3 overflow-auto">
        <input
          type="text"
          value={slide.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Slide title (optional)"
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700"
        />

        <div className="flex gap-2">
          <select
            value={slide.language}
            onChange={(e) => onChange({ language: e.target.value })}
            className="flex-1 rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
          >
            {LANG_LIST.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>

          <select
            value={slide.theme}
            onChange={(e) => onChange({ theme: e.target.value })}
            className="flex-1 rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm dark:border-zinc-700"
          >
            {THEME_LIST.map((theme) => (
              <option key={theme} value={theme}>
                {theme}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={slide.code}
          onChange={(e) => onChange({ code: e.target.value })}
          spellCheck={false}
          className="flex-1 resize-none rounded-md border border-zinc-300 bg-zinc-950 px-4 py-3 font-mono text-sm text-zinc-100 outline-none focus:border-blue-500 dark:border-zinc-700"
          placeholder="Paste your code here…"
        />
      </div>

      {/* Right: live preview */}
      <div className="flex w-1/2 flex-col overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-4 dark:border-zinc-800">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Preview</p>
        {slide.title && (
          <h2 className="mb-3 text-lg font-semibold text-zinc-100">{slide.title}</h2>
        )}
        <div className="flex-1 overflow-auto text-xs">
          <ShikiCodeBlock code={slide.code} lang={slide.language} theme={slide.theme} />
        </div>
      </div>
    </div>
  );
}
