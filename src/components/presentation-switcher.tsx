"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Trash2, X } from "lucide-react";
import type { Presentation } from "@/types";

interface PresentationSwitcherProps {
  presentations: Presentation[];
  activePresentationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
}

export function PresentationSwitcher({
  presentations,
  activePresentationId,
  onSelect,
  onDelete,
  onDeleteAll,
}: PresentationSwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activePresentation = presentations.find((item) => item.id === activePresentationId);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelect(id: string) {
    onSelect(id);
    setOpen(false);
  }

  function handleDelete(presentation: Presentation) {
    const name = presentation.name || "Untitled Presentation";
    if (!window.confirm(`Delete "${name}"?`)) return;
    onDelete(presentation.id);
    setOpen(false);
  }

  function handleDeleteAll() {
    if (!window.confirm("Delete all presentations? This will replace them with one blank presentation.")) return;
    onDeleteAll();
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="input-glow flex max-w-44 items-center gap-2 rounded-md border border-[--border] bg-white/[0.02] py-1 pl-2 pr-2 text-xs text-zinc-400 outline-none transition-all hover:border-[--border-bright] hover:bg-white/[0.04] focus:border-[--accent]"
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {activePresentation?.name || "Untitled Presentation"}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-md border border-[--border-bright] bg-[#19191b] p-1 shadow-2xl shadow-black/60">
          {presentations.map((presentation) => {
            const name = presentation.name || "Untitled Presentation";
            const active = presentation.id === activePresentationId;

            return (
              <div
                key={presentation.id}
                className={`group flex items-center gap-1 rounded-md ${active ? "bg-emerald-500/10" : "hover:bg-white/[0.04]"}`}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(presentation.id)}
                  className={`min-w-0 flex-1 truncate rounded-md px-2 py-2 text-left text-xs transition-colors ${active ? "text-emerald-300" : "text-zinc-300"}`}
                  title={name}
                >
                  {name}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(presentation)}
                  className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
                  aria-label={`Delete ${name}`}
                  title={`Delete ${name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          {presentations.length > 1 && (
            <div className="mt-1 border-t border-[--border] pt-1">
              <button
                type="button"
                onClick={handleDeleteAll}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete all presentations
              </button>
              <p className="px-2 pb-1 text-[10px] leading-4 text-zinc-600">Leaves one blank presentation.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
