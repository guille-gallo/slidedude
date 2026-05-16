"use client";

import { useCallback, useRef, useState } from "react";
import type { ContentSlide } from "@/types";
import { compressImage, compressImageFromDataUrl } from "@/utils/compress-image";
import Image from "next/image";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { UploadCloud, X, StickyNote, Plus } from "lucide-react";
import { MAX_IMAGES_PER_SLIDE, ALLOWED_IMAGE_MIME } from "@/lib/constants";
import { ContentImageGrid } from "@/components/content-image-grid";

interface ContentSlideEditorProps {
  slide: ContentSlide;
  onChange: (patch: Partial<ContentSlide>) => void;
}

export function ContentSlideEditor({ slide, onChange }: ContentSlideEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  /** Compress and append files to the slide's image list. */
  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const current = slide.imageDataUrls;
      const capacity = MAX_IMAGES_PER_SLIDE - current.length;

      const allowed = files.filter((f) =>
        (ALLOWED_IMAGE_MIME as readonly string[]).includes(f.type)
      );
      const rejected = files.length - allowed.length;
      const capped = allowed.slice(0, capacity);
      const overCap = allowed.length - capped.length;

      const messages: string[] = [];
      if (rejected > 0) messages.push(`${rejected} file(s) skipped — unsupported type.`);
      if (overCap > 0)
        messages.push(
          `${overCap} file(s) skipped — maximum ${MAX_IMAGES_PER_SLIDE} images per slide.`
        );
      setImageError(messages.length > 0 ? messages.join(" ") : null);

      if (capped.length === 0) return;

      const compressed = await Promise.all(capped.map((f) => compressImage(f)));
      onChange({ imageDataUrls: [...current, ...compressed] });
    },
    [slide.imageDataUrls, onChange]
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageFiles = items
        .filter((item) => (ALLOWED_IMAGE_MIME as readonly string[]).includes(item.type))
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);

      if (imageFiles.length > 0) {
        e.preventDefault();
        await handleFiles(imageFiles);
        return;
      }

      // Check for pasted data URL text
      const text = e.clipboardData.getData("text/plain");
      if (text.startsWith("data:image/")) {
        e.preventDefault();
        const current = slide.imageDataUrls;
        if (current.length >= MAX_IMAGES_PER_SLIDE) {
          setImageError(`Maximum ${MAX_IMAGES_PER_SLIDE} images per slide reached.`);
          return;
        }
        const compressed = await compressImageFromDataUrl(text);
        onChange({ imageDataUrls: [...current, compressed] });
      }
    },
    [handleFiles, slide.imageDataUrls, onChange]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      await handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeImage = useCallback(
    (index: number) => {
      const next = slide.imageDataUrls.filter((_, i) => i !== index);
      onChange({ imageDataUrls: next });
      setImageError(null);
    },
    [slide.imageDataUrls, onChange]
  );

  const hasImages = slide.imageDataUrls.length > 0;
  const atCap = slide.imageDataUrls.length >= MAX_IMAGES_PER_SLIDE;

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

        <input
          type="text"
          value={slide.section ?? ""}
          onChange={(e) => onChange({ section: e.target.value || undefined })}
          placeholder="Section (optional)"
          className="input-glow rounded-lg border border-[--border] bg-white/[0.02] px-3 py-2 text-xs text-zinc-400 placeholder-zinc-600 outline-none transition-all focus:border-[--accent] focus:bg-white/[0.04]"
        />

        <div className="flex items-center gap-3 rounded-lg border border-[--border] bg-white/[0.02] px-3 py-2.5">
          <label htmlFor="slide-font-size" className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Size</label>
          <input
            id="slide-font-size"
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

        {/* Image upload area */}
        <div className="flex flex-col gap-2">
          {/* Thumbnail strip */}
          {hasImages && (
            <div className="flex flex-wrap gap-2">
              {slide.imageDataUrls.map((src, i) => (
                <div key={i} className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-[--border]">
                  <Image
                    src={src}
                    alt={`Image ${i + 1}`}
                    fill
                    unoptimized
                    className="object-contain"
                    sizes="96px"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    aria-label={`Remove image ${i + 1}`}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[--border-bright] bg-[--surface-bright] text-zinc-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Drop zone — shown when under cap */}
          {!atCap && (
            <button
              type="button"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="group flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[--border-bright] bg-white/[0.01] p-4 text-sm text-zinc-600 transition-all hover:border-emerald-500/30 hover:bg-white/[0.03]"
            >
              {hasImages ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5 text-zinc-600 group-hover:text-emerald-500" />
                  <span>Add more ({slide.imageDataUrls.length}/{MAX_IMAGES_PER_SLIDE})</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-zinc-600 transition-colors group-hover:text-emerald-500" />
                  <span className="text-xs">Drop images or click to upload</span>
                </div>
              )}
            </button>
          )}

          {atCap && (
            <p className="text-center text-xs text-zinc-600">
              Maximum {MAX_IMAGES_PER_SLIDE} images reached.
            </p>
          )}

          {imageError && (
            <p className="text-xs text-amber-400">{imageError}</p>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_MIME.join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFiles(e.target.files);
            // Reset so the same files can be re-selected if removed
            e.target.value = "";
          }}
        />

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
          <ContentImageGrid images={slide.imageDataUrls} />
        </div>
      </Panel>
    </PanelGroup>
  );
}
