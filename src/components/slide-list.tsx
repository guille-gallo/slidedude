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

interface SlideListProps {
  slides: Slide[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddSlide: (type: "code" | "content") => void;
  onRemoveSlide: (index: number) => void;
}

function SortableSlideItem({
  slide,
  index,
  isActive,
  onSelect,
  onRemove,
}: {
  slide: Slide;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: slide.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative cursor-pointer rounded-lg border-2 p-3 transition-colors ${
        isActive
          ? "border-blue-500 bg-blue-500/10"
          : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-500"
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-xs text-zinc-400 hover:text-zinc-300"
          onClick={(e) => e.stopPropagation()}
        >
          ⠿
        </span>
        <span className="text-xs font-medium text-zinc-400">{index + 1}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
            slide.type === "code"
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-purple-500/20 text-purple-400"
          }`}
        >
          {slide.type}
        </span>
      </div>
      <p className="mt-1 truncate text-xs text-zinc-400">
        {slide.title || (slide.type === "code" ? slide.code.slice(0, 40) : "No title")}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute right-1 top-1 hidden rounded p-0.5 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 group-hover:block"
        title="Remove slide"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
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
}: SlideListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
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
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Slides</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slideIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1.5">
              {slides.map((slide, index) => (
                <SortableSlideItem
                  key={slide.id}
                  slide={slide}
                  index={index}
                  isActive={index === activeIndex}
                  onSelect={() => onSelect(index)}
                  onRemove={() => onRemoveSlide(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex gap-1 border-t border-zinc-800 p-2">
        <button
          onClick={() => onAddSlide("code")}
          className="flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
        >
          + Code
        </button>
        <button
          onClick={() => onAddSlide("content")}
          className="flex flex-1 items-center justify-center gap-1 rounded-md bg-purple-600 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-700"
        >
          + Content
        </button>
      </div>
    </div>
  );
}
