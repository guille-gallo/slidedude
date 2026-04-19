"use client";

import { useCallback, useRef, useState } from "react";
import type { ContentSlide } from "@/types";
import { compressImage, compressImageFromDataUrl } from "@/utils/compress-image";
import Image from "next/image";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { UploadCloud, X, StickyNote } from "lucide-react";

interface ContentSlideEditorProps {
  slide: ContentSlide;
  onChange: (patch: Partial<ContentSlide>) => void;
}

export function ContentSlideEditor({ slide, onChange }: ContentSlideEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNotes, setShowNotes] = useState(false);

  const handleImageFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const compressed = await compressImage(file);
      onChange({ imageDataUrl: compressed });
    },
    [onChange]
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const compressed = await compressImage(file);
            onChange({ imageDataUrl: compressed });
          }
          return;
        }
      }

      // Check for pasted data URL text
      const text = e.clipboardData.getData("text/plain");
      if (text.startsWith("data:image/")) {
        e.preventDefault();
        const compressed = await compressImageFromDataUrl(text);
        onChange({ imageDataUrl: compressed });
      }
    },
    [onChange]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) await handleImageFile(file);
    },
    [handleImageFile]
  );

  return (
    <PanelGroup direction="horizontal" className="flex h-full">
      {/* Left: editor controls */}
      <Panel defaultSize={40} minSize={30} className="flex flex-col gap-4 overflow-auto pr-3">
        <input
          type="text"
          value={slide.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Slide title"
          style={{ fontSize: `${Math.min(slide.fontSize, 48)}px` }}
          className="input-glow rounded-lg border border-[--border] bg-white/[0.02] px-3 py-2 font-semibold text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-[--accent] focus:bg-white/[0.04]"
        />

        <div className="flex items-center gap-3 rounded-lg border border-[--border] bg-white/[0.02] px-3 py-2.5">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Size</label>
          <input
            type="range"
            min={16}
            max={72}
            value={slide.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="w-8 rounded bg-white/[0.04] px-1.5 py-0.5 text-center font-mono text-[11px] text-zinc-400">{slide.fontSize}</span>
        </div>

        <textarea
          value={slide.body}
          onChange={(e) => onChange({ body: e.target.value })}
          onPaste={handlePaste}
          className="input-glow flex-1 resize-none rounded-lg border border-[--border] bg-white/[0.02] px-3 py-3 text-sm text-zinc-300 placeholder-zinc-600 outline-none transition-all focus:border-[--accent] focus:bg-white/[0.04]"
          placeholder="Body text… (paste an image here too)"
        />

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="group flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[--border-bright] bg-white/[0.01] p-6 text-sm text-zinc-600 transition-all hover:border-emerald-500/30 hover:bg-white/[0.03]"
        >
          {slide.imageDataUrl ? (
            <div className="relative">
              <Image
                src={slide.imageDataUrl}
                alt="Slide image"
                width={200}
                height={120}
                className="max-h-32 rounded-lg object-contain"
                unoptimized
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ imageDataUrl: null });
                }}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-[--border-bright] bg-[--surface-bright] text-zinc-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <UploadCloud className="h-5 w-5 text-zinc-600 transition-colors group-hover:text-emerald-500" />
              <span className="text-xs">Drop image or click to upload</span>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file);
            }}
          />
        </div>
        {/* Notes toggle */}
        <div>
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
      </Panel>

      <PanelResizeHandle className="resize-handle relative w-[5px] bg-transparent" />

      {/* Right: live preview */}
      <Panel className="canvas-bg flex flex-col items-center justify-center overflow-auto rounded-lg border border-[--border] p-8">
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 overflow-hidden">
          {slide.title && (
            <h1
              className="text-center font-bold text-zinc-100"
              style={{ fontSize: `${slide.fontSize}px` }}
            >
              {slide.title}
            </h1>
          )}
          {slide.body && (
            <p className="max-w-2xl whitespace-pre-wrap text-center text-xl text-zinc-300">{slide.body}</p>
          )}
          {slide.imageDataUrl && (
            <Image
              src={slide.imageDataUrl}
              alt="Slide image"
              width={600}
              height={400}
              className="max-h-[60vh] rounded-xl object-contain shadow-2xl"
              unoptimized
            />
          )}
        </div>
      </Panel>
    </PanelGroup>
  );
}
