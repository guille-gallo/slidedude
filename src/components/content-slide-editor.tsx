"use client";

import { useCallback, useRef } from "react";
import type { ContentSlide } from "@/types";
import { compressImage, compressImageFromDataUrl } from "@/utils/compress-image";
import Image from "next/image";

interface ContentSlideEditorProps {
  slide: ContentSlide;
  onChange: (patch: Partial<ContentSlide>) => void;
}

export function ContentSlideEditor({ slide, onChange }: ContentSlideEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="flex h-full gap-4">
      {/* Left: editor controls */}
      <div className="flex w-1/2 flex-col gap-3 overflow-auto">
        <input
          type="text"
          value={slide.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Slide title"
          style={{ fontSize: `${Math.min(slide.fontSize, 48)}px` }}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 font-semibold outline-none focus:border-blue-500 dark:border-zinc-700"
        />

        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-500">Font size</label>
          <input
            type="range"
            min={16}
            max={72}
            value={slide.fontSize}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="flex-1"
          />
          <span className="w-10 text-right text-xs text-zinc-400">{slide.fontSize}px</span>
        </div>

        <textarea
          value={slide.body}
          onChange={(e) => onChange({ body: e.target.value })}
          onPaste={handlePaste}
          className="flex-1 resize-none rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-zinc-700"
          placeholder="Body text… (paste an image here too)"
        />

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-zinc-300 p-4 text-sm text-zinc-400 transition-colors hover:border-blue-400 hover:text-blue-400 dark:border-zinc-700"
        >
          {slide.imageDataUrl ? (
            <div className="relative">
              <Image
                src={slide.imageDataUrl}
                alt="Slide image"
                width={200}
                height={120}
                className="max-h-32 rounded object-contain"
                unoptimized
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({ imageDataUrl: null });
                }}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
              >
                ×
              </button>
            </div>
          ) : (
            <span>Drop image here or click to upload</span>
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
      </div>

      {/* Right: live preview */}
      <div className="flex w-1/2 flex-col items-center justify-center overflow-auto rounded-lg border border-zinc-200 bg-zinc-950 p-8 dark:border-zinc-800">
        <p className="mb-4 self-start text-xs font-medium uppercase tracking-wider text-zinc-500">
          Preview
        </p>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          {slide.title && (
            <h2
              className="text-center font-semibold text-zinc-100"
              style={{ fontSize: `${slide.fontSize}px` }}
            >
              {slide.title}
            </h2>
          )}
          {slide.body && (
            <p className="max-w-md whitespace-pre-wrap text-center text-zinc-300">{slide.body}</p>
          )}
          {slide.imageDataUrl && (
            <Image
              src={slide.imageDataUrl}
              alt="Slide image"
              width={600}
              height={400}
              className="max-h-64 rounded-lg object-contain"
              unoptimized
            />
          )}
        </div>
      </div>
    </div>
  );
}
