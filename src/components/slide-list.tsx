"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Slide } from "@/types";
import { GripVertical, Copy, Trash2, Code2, Type, Workflow, AlertTriangle } from "lucide-react";
import {
  CODE_PRESENTATION_MAX_CHARS,
  CODE_PRESENTATION_MAX_LINES,
  getCodeLimitInfo,
} from "@/lib/code-limits";

interface SlideListProps {
  slides: Slide[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddSlide: (type: "code" | "content" | "mermaid") => void;
  onRemoveSlide: (index: number) => void;
  onDuplicateSlide: (index: number) => void;
}

function SortableSlideItem({
  slide,
  index,
  isActive,
  onSelect,
  onRemove,
  onDuplicate,
}: {
  slide: Slide;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const codeLimit = slide.type === "code" ? getCodeLimitInfo(slide.code) : null;
  const blocksPresentation = codeLimit?.blocksPresentation ?? false;
  const blockReason = codeLimit && blocksPresentation
    ? codeLimit.lineCount >= CODE_PRESENTATION_MAX_LINES
      ? `${codeLimit.lineCount}/${CODE_PRESENTATION_MAX_LINES} lines — over the cap. Split this slide to enable Present.`
      : `${codeLimit.charCount.toLocaleString()}/${CODE_PRESENTATION_MAX_CHARS.toLocaleString()} chars — over the cap. Split this slide to enable Present.`
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      onClick={onSelect}
      role="option"
      aria-selected={isActive}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
      className={`group relative cursor-pointer active:cursor-grabbing rounded-lg border p-2.5 transition-all duration-150 ${
        isDragging ? "cursor-grabbing" : ""
      } ${
        isActive
          ? blocksPresentation
            ? "border-red-500/50 bg-red-500/[0.06] shadow-[0_0_16px_-4px_rgba(248,113,113,0.25),inset_0_0_0_1px_rgba(248,113,113,0.12)]"
            : "border-emerald-500/50 bg-emerald-500/[0.08] shadow-[0_0_16px_-4px_rgba(52,211,153,0.25),inset_0_0_0_1px_rgba(52,211,153,0.1)]"
          : blocksPresentation
            ? "border-red-500/30 bg-red-500/[0.03] hover:border-red-500/50 hover:bg-red-500/[0.06]"
            : "border-[--border] bg-white/[0.02] hover:border-[--border-bright] hover:bg-white/[0.04]"
      }`}
    >
      {isActive && (
        <div
          className={`absolute left-0 top-[15%] h-[70%] w-[2px] rounded-full ${
            blocksPresentation ? "bg-red-400" : "bg-emerald-400"
          }`}
        />
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-zinc-600 transition-colors hover:text-zinc-400"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Reorder slide ${index + 1}`}
        >
          <GripVertical className="h-3 w-3" />
        </button>
        <span className={`font-mono text-[10px] ${isActive ? "text-emerald-400" : "text-zinc-600"}`}>{String(index + 1).padStart(2, "0")}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
            slide.type === "code"
              ? "bg-emerald-500/10 text-emerald-500"
              : slide.type === "mermaid"
                ? "bg-sky-500/10 text-sky-400"
                : "bg-violet-500/10 text-violet-400"
          }`}
        >
          {slide.type === "mermaid" ? "diagram" : slide.type}
        </span>
        {blocksPresentation && (
          <span
            className="ml-1 flex shrink-0 items-center text-red-400"
            title={blockReason ?? "Slide exceeds presentation limits"}
            aria-label={blockReason ?? "Slide exceeds presentation limits"}
          >
            <AlertTriangle className="h-3 w-3" aria-hidden />
          </span>
        )}
      </div>
      {slide.section && (
        <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-wider text-zinc-600">
          · {slide.section}
        </p>
      )}
      <p className="mt-1.5 truncate text-xs text-zinc-500">
        {slide.title || (slide.type === "code" ? slide.code.slice(0, 40) : slide.type === "mermaid" ? slide.source.split("\n")[0]?.slice(0, 40) : "Untitled")}
      </p>
      <div className="absolute right-1 top-1 hidden items-center gap-0.5 group-hover:flex">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="cursor-pointer rounded p-1 text-zinc-600 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
          title="Duplicate slide"
          aria-label={`Duplicate slide ${index + 1}`}
        >
          <Copy className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm("Delete this slide?")) onRemove();
          }}
          className="cursor-pointer rounded p-1 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
          title="Remove slide"
          aria-label={`Delete slide ${index + 1}`}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function SlideList({
  slides,
  activeIndex,
  onSelect,
  onReorder,
  onAddSlide,
  onRemoveSlide,
  onDuplicateSlide,
}: SlideListProps) {
  const sensors = useSensors(
    // Distance constraint keeps plain clicks selecting the slide; dragging
    // starts anywhere on the row once the pointer moves.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const slideIds = useMemo(() => slides.map((s) => s.id), [slides]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(oldIndex, newIndex);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-white">Slides</h2>
        <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono text-white">{slides.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <DndContext id="slidedude-slide-list" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slideIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1" role="listbox" aria-label="Slides">
              {slides.map((slide, index) => (
                <SortableSlideItem
                  key={slide.id}
                  slide={slide}
                  index={index}
                  isActive={index === activeIndex}
                  onSelect={() => onSelect(index)}
                  onRemove={() => onRemoveSlide(index)}
                  onDuplicate={() => onDuplicateSlide(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex gap-1.5 border-t border-[--border] p-2.5">
        <button
          onClick={() => onAddSlide("code")}
          aria-label="Add code slide"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[--border] bg-white/[0.02] px-2 py-2 text-[11px] font-medium text-zinc-400 transition-all hover:border-emerald-500/30 hover:bg-white/[0.04] hover:text-emerald-400"
        >
          <Code2 className="h-3.5 w-3.5" /> Code
        </button>
        <button
          onClick={() => onAddSlide("content")}
          aria-label="Add content slide"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[--border] bg-white/[0.02] px-2 py-2 text-[11px] font-medium text-zinc-400 transition-all hover:border-violet-500/30 hover:bg-white/[0.04] hover:text-violet-400"
        >
          <Type className="h-3.5 w-3.5" /> Content
        </button>
        <button
          onClick={() => onAddSlide("mermaid")}
          aria-label="Add diagram slide"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[--border] bg-white/[0.02] px-2 py-2 text-[11px] font-medium text-zinc-400 transition-all hover:border-sky-500/30 hover:bg-white/[0.04] hover:text-sky-400"
        >
          <Workflow className="h-3.5 w-3.5" /> Diagram
        </button>
      </div>
    </div>
  );
}
