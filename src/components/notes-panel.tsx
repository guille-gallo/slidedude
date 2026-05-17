"use client";

import { useRef, useState, useEffect, useCallback } from "react";

const DEFAULT_HEIGHT = 240;
const MIN_HEIGHT = 120;
const KEYBOARD_STEP = 24;
const STORAGE_KEY_DEFAULT = "slido:notes-height";

function computeMax(): number {
  if (typeof window === "undefined") return 720;
  return Math.min(720, Math.max(MIN_HEIGHT, window.innerHeight - 160));
}

function clamp(value: number): number {
  return Math.max(MIN_HEIGHT, Math.min(computeMax(), value));
}

function readStoredHeight(key: string): number {
  if (typeof window === "undefined") return DEFAULT_HEIGHT;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return clamp(parsed);
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_HEIGHT;
}

function persist(key: string, height: number): void {
  try {
    localStorage.setItem(key, String(height));
  } catch {
    /* ignore */
  }
}

interface NotesPanelProps {
  open: boolean;
  value: string;
  onChange: (next: string | undefined) => void;
  placeholder?: string;
  storageKey?: string;
}

export function NotesPanel({
  open,
  value,
  onChange,
  placeholder = "Speaker notes…",
  storageKey = STORAGE_KEY_DEFAULT,
}: NotesPanelProps) {
  const [height, setHeight] = useState(() => readStoredHeight(storageKey));
  const dragStateRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const isDraggingRef = useRef(false);

  // Clean up body style on unmount
  useEffect(() => {
    return () => {
      if (isDraggingRef.current) {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragStateRef.current = { startY: e.clientY, startHeight: height };
      isDraggingRef.current = true;
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    },
    [height]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) return;
    const { startY, startHeight } = dragStateRef.current;
    const newHeight = clamp(startHeight - (e.clientY - startY));
    setHeight(newHeight);
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStateRef.current) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      const { startY, startHeight } = dragStateRef.current;
      const finalHeight = clamp(startHeight - (e.clientY - startY));
      dragStateRef.current = null;
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setHeight(finalHeight);
      queueMicrotask(() => persist(storageKey, finalHeight));
    },
    [storageKey]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      let next: number | null = null;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        next = clamp(height + KEYBOARD_STEP);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        next = clamp(height - KEYBOARD_STEP);
      } else if (e.key === "Home") {
        e.preventDefault();
        next = computeMax();
      } else if (e.key === "End") {
        e.preventDefault();
        next = MIN_HEIGHT;
      }
      if (next !== null) {
        setHeight(next);
        queueMicrotask(() => persist(storageKey, next!));
      }
    },
    [height, storageKey]
  );

  if (!open) return null;

  return (
    <div className="flex shrink-0 flex-col" style={{ height }}>
      {/* Drag handle */}
      <div
        role="slider"
        aria-orientation="vertical"
        aria-label="Resize presenter notes"
        aria-valuemin={MIN_HEIGHT}
        aria-valuemax={computeMax()}
        aria-valuenow={height}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="group relative h-3 shrink-0 cursor-ns-resize rounded-t-md bg-white/[0.04] transition-colors hover:bg-emerald-500/20 focus-visible:bg-emerald-500/30 focus-visible:outline-none"
      >
        {/* Grip pill */}
        <div className="absolute left-1/2 top-1/2 h-0.5 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 transition-colors group-hover:bg-emerald-400 group-focus-visible:bg-emerald-400" />
      </div>
      {/* Notes textarea */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder={placeholder}
        className="input-glow w-full flex-1 resize-none rounded-b-lg border border-t-0 border-[--border] bg-white/[0.02] px-3 py-2 text-sm text-zinc-300 placeholder-zinc-600 outline-none transition-all focus:border-[--accent] focus:bg-white/[0.04]"
      />
    </div>
  );
}
