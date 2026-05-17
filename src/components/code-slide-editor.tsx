"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import type { CodeSlide } from "@/types";
import { LANG_LIST } from "@/hooks/use-highlighter";
import {
  CODE_PRESENTATION_MAX_CHARS,
  CODE_PRESENTATION_MAX_LINES,
  getCodeLimitInfo,
} from "@/lib/code-limits";
import { ShikiCodeBlock } from "./shiki-code-block";

import { AlertTriangle, Code2, ChevronDown, StickyNote } from "lucide-react";
import { NotesPanel } from "@/components/notes-panel";

interface CodeSlideEditorProps {
  slide: CodeSlide;
  onChange: (patch: Partial<CodeSlide>) => void;
}

const LIMIT_ERROR_MESSAGE = `Code slide is capped at ${CODE_PRESENTATION_MAX_LINES} lines / ${CODE_PRESENTATION_MAX_CHARS.toLocaleString()} chars. Split long examples into consecutive slides.`;
export function CodeSlideEditor({ slide, onChange }: CodeSlideEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const limit = getCodeLimitInfo(slide.code);
  const atLineLimit = limit.lineCount >= CODE_PRESENTATION_MAX_LINES;
  const blocksPresentation = limit.blocksPresentation;

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const flashLimitError = useCallback(() => {
    setLimitMessage(LIMIT_ERROR_MESSAGE);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    errorTimeoutRef.current = setTimeout(() => setLimitMessage(null), 3000);
  }, []);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleCodeChange = useCallback(
    (value: string) => {
      const newLineCount = value.split("\n").length;
      const newCharCount = value.length;
      const currentLineCount = slide.code.split("\n").length;
      const currentCharCount = slide.code.length;
      const growsLines = newLineCount > currentLineCount;
      const growsChars = newCharCount > currentCharCount;
      const overLines = newLineCount > CODE_PRESENTATION_MAX_LINES;
      const overChars = newCharCount > CODE_PRESENTATION_MAX_CHARS;

      // Only reject edits that GROW the slide past the cap. Reductions and
      // same-size edits must always pass through, even when already over the
      // cap (e.g. legacy / imported slides), so users can edit their way back.
      if ((overLines && growsLines) || (overChars && growsChars)) {
        if (!getCodeLimitInfo(slide.code).blocksPresentation) {
          flashLimitError();
        }
        // Browser already wrote the over-limit text into the DOM; sync it back
        // to the persisted value so the next edit starts from a clean state.
        if (textareaRef.current && textareaRef.current.value !== slide.code) {
          textareaRef.current.value = slide.code;
        }
        return;
      }

      if (limitMessage) {
        setLimitMessage(null);
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = null;
        }
      }
      onChange({ code: value });
    },
    [onChange, flashLimitError, limitMessage, slide.code]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.currentTarget;
      const { selectionStart, selectionEnd, value } = target;
      // If the selection covers any newline(s), Enter is a net replacement that won't grow line count.
      if (selectionStart !== selectionEnd) {
        const selected = value.slice(selectionStart, selectionEnd);
        if (selected.includes("\n")) return;
      }
      const lineCount = value.split("\n").length;
      if (lineCount >= CODE_PRESENTATION_MAX_LINES) {
        e.preventDefault();
        // The persistent banner is already visible at the cap; avoid a redundant flash.
        if (!getCodeLimitInfo(slide.code).blocksPresentation) {
          flashLimitError();
        }
      }
    },
    [flashLimitError, slide.code]
  );

  const showError = Boolean(limitMessage) || blocksPresentation;
  const errorText = blocksPresentation ? LIMIT_ERROR_MESSAGE : limitMessage;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
      {/* Controls bar */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={slide.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Slide title (optional)"
          className="input-glow flex-1 rounded-lg border border-[--border] bg-white/[0.02] px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none transition-all focus:border-[--accent] focus:bg-white/[0.04]"
        />

        <input
          type="text"
          value={slide.section ?? ""}
          onChange={(e) => onChange({ section: e.target.value || undefined })}
          placeholder="Section"
          className="input-glow w-32 rounded-lg border border-[--border] bg-white/[0.02] px-3 py-2 text-xs text-zinc-400 placeholder-zinc-600 outline-none transition-all focus:border-[--accent] focus:bg-white/[0.04]"
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

        <div
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs ${
            atLineLimit
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : "border-[--border] bg-white/[0.02] text-zinc-500"
          }`}
          title={`Code slides are capped at ${CODE_PRESENTATION_MAX_LINES} lines so they fit small screens. Split longer snippets into consecutive slides.`}
        >
          {atLineLimit && <AlertTriangle className="h-3.5 w-3.5" />}
          <span className="font-mono">{limit.lineCount}/{CODE_PRESENTATION_MAX_LINES} lines</span>
        </div>
      </div>

      {showError && errorText && (
        <p className="text-xs text-red-300">
          {errorText}
        </p>
      )}

      {/* Overlay code editor */}
      <div className="relative flex-1 overflow-hidden rounded-lg border border-[--border] bg-[#0a0a0a]">
        {/* Line numbers gutter */}
        <div
          ref={gutterRef}
          className="shiki-overlay-gutter absolute inset-y-0 left-0 z-10 w-10 overflow-hidden border-r border-white/[0.06] bg-[#0a0a0a] py-3"
        >
          {Array.from({ length: limit.lineCount }, (_, i) => (
            <div
              key={i}
              className="shiki-overlay-line block w-full pr-2 text-right text-zinc-700"
            >
              {i + 1}
            </div>
          ))}
        </div>
        {/* Syntax-highlighted layer */}
        <div
          ref={highlightRef}
          aria-hidden
          className="shiki-overlay-editor pointer-events-none absolute inset-0 overflow-hidden py-3 pl-12 pr-4"
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
          onChange={(e) => handleCodeChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          className="shiki-overlay-textarea absolute inset-0 resize-none bg-transparent py-3 pl-12 pr-4 text-transparent caret-emerald-400 outline-none selection:bg-emerald-500/15"
          placeholder="Paste your code here…"
        />
      </div>

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
      </div>
      <NotesPanel
        open={showNotes}
        value={slide.notes ?? ""}
        onChange={(v) => onChange({ notes: v })}
        placeholder="Speaker notes (visible only to you during presentation)…"
      />
    </div>
  );
}
