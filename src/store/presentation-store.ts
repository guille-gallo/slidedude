import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import type { Presentation, Slide, CodeSlide, ContentSlide, MermaidSlide } from "@/types";
import { generateId } from "@/utils/id";
import { SAVE_DEBOUNCE_MS } from "@/lib/constants";
import { MAX_PRESENTATIONS, normalizeSlide } from "@/lib/validation";

export type SlideType = Slide["type"];

function createDefaultCodeSlide(): CodeSlide {
  return {
    id: generateId(),
    type: "code",
    title: "",
    code: 'const hello = "world";',
    language: "typescript",
  };
}

function createDefaultContentSlide(): ContentSlide {
  return {
    id: generateId(),
    type: "content",
    title: "Untitled",
    body: "",
    imageDataUrls: [],
    fontSize: 32,
  };
}

function createDefaultMermaidSlide(): MermaidSlide {
  return {
    id: generateId(),
    type: "mermaid",
    title: "Diagram",
    source: "flowchart TB\n  A[Domain] --> B[Application]\n  B --> C[Adapters]\n  C --> D[Frameworks]",
  };
}

function createDefaultSlide(type: SlideType): Slide {
  if (type === "code") return createDefaultCodeSlide();
  if (type === "content") return createDefaultContentSlide();
  return createDefaultMermaidSlide();
}

function createDefaultPresentation(): Presentation {
  return {
    id: generateId(),
    name: "Untitled Presentation",
    slides: [createDefaultCodeSlide()],
    activeSlideIndex: 0,
  };
}

// --- Cloud sync ---

type SyncStatus = "idle" | "saving" | "saved" | "error";

const MAX_SYNC_ATTEMPTS = 3;
/** How long to wait before retrying after the API rate limit was hit, and how often. */
const RATE_LIMIT_BACKOFF_MS = 15_000;
const MAX_RATE_LIMIT_WAITS = 5;
/** Requests above this size can't use `keepalive` (browsers cap it at 64 KiB). */
const KEEPALIVE_MAX_CHARS = 30_000;

let saveTimer: ReturnType<typeof setTimeout> | null = null;
/** True when local changes still have to be written to the server. */
let saveRequested = false;
/** The sync loop currently running, if any. Only one runs at a time. */
let syncInFlight: Promise<void> | null = null;
/** Revision ids this tab asked the server to store, to recognise its own writes. */
const attemptedRevisions = new Set<string>();

function scheduleSave() {
  if (!usePresentationStore.getState().pendingSync) {
    usePresentationStore.setState({ pendingSync: true });
  }
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void usePresentationStore.getState().saveToServer();
  }, SAVE_DEBOUNCE_MS);
}

function cancelScheduledSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
}

function hasUnsavedChanges() {
  return saveRequested || saveTimer !== null;
}

/** Sends a debounced save right away, e.g. when the tab is being hidden or closed. */
export function flushScheduledSave() {
  if (saveTimer) void usePresentationStore.getState().saveToServer();
}

/** Retries whatever could not be synced earlier, e.g. once the network is back. */
export function retryPendingSync() {
  if (usePresentationStore.getState().pendingSync) {
    void usePresentationStore.getState().saveToServer();
  } else if (readPendingDeletes().length > 0) {
    void startSync();
  }
}

function startSync(): Promise<void> {
  if (!syncInFlight) {
    syncInFlight = runSync().finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
}

// --- Pending deletions ---
//
// Deleted presentation ids are kept in their own small localStorage entry until
// the server confirms them. Unlike the main entry it still fits when storage is
// nearly full, and it lets a deletion be replayed if the tab is closed or
// reloaded before the request went through.

const PENDING_DELETES_KEY = "slidedude-pending-deletes";
let memoryPendingDeletes: string[] = [];

function readPendingDeletes(): string[] {
  try {
    const raw = localStorage.getItem(PENDING_DELETES_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      const stored = parsed.filter((id): id is string => typeof id === "string");
      return [...new Set([...stored, ...memoryPendingDeletes])];
    }
  } catch {
    // Storage unavailable — fall back to the in-memory copy.
  }
  return memoryPendingDeletes;
}

function writePendingDeletes(ids: string[]) {
  memoryPendingDeletes = ids;
  try {
    if (ids.length === 0) localStorage.removeItem(PENDING_DELETES_KEY);
    else localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(ids));
  } catch {
    // Keep the in-memory copy.
  }
}

function addPendingDeletes(ids: string[]) {
  writePendingDeletes([...new Set([...readPendingDeletes(), ...ids])]);
}

function removePendingDeletes(ids: string[]) {
  writePendingDeletes(readPendingDeletes().filter((id) => !ids.includes(id)));
}

// --- Sync loop ---

type StepResult = "ok" | "retry" | "rate-limited" | "failed" | "conflict";

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    const data: unknown = await res.json();
    return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function stepResultForStatus(status: number): StepResult {
  usePresentationStore.setState({ syncErrorStatus: status });
  if (status === 429) return "rate-limited";
  // Other 4xx errors won't go away by sending the same request again.
  return status >= 500 ? "retry" : "failed";
}

async function pushDeletes(ids: string[]): Promise<StepResult> {
  let res: Response;
  try {
    const params = new URLSearchParams(ids.map((id) => ["id", id]));
    res = await fetch(`/api/presentations?${params.toString()}`, {
      method: "DELETE",
      keepalive: true,
    });
  } catch {
    usePresentationStore.setState({ syncErrorStatus: null });
    return "retry";
  }
  if (!res.ok) return stepResultForStatus(res.status);

  const data = await readJson(res);
  removePendingDeletes(ids);

  const previousRevision = typeof data.previousRevision === "string" ? data.previousRevision : null;
  const revision = typeof data.revision === "string" ? data.revision : null;
  if (previousRevision !== usePresentationStore.getState().revision) {
    // The server copy had changes this tab never saw.
    return "conflict";
  }
  if (revision !== previousRevision) usePresentationStore.setState({ revision });
  return "ok";
}

async function pushSave(): Promise<StepResult> {
  const { presentations, revision: baseRevision } = usePresentationStore.getState();
  const revision = generateId();
  const body = JSON.stringify({ presentations, baseRevision, revision });

  attemptedRevisions.add(revision);
  saveRequested = false;

  let res: Response;
  try {
    res = await fetch("/api/presentations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: body.length <= KEEPALIVE_MAX_CHARS,
    });
  } catch {
    saveRequested = true;
    usePresentationStore.setState({ syncErrorStatus: null });
    return "retry";
  }

  if (res.ok) {
    const data = await readJson(res);
    usePresentationStore.setState({
      revision: typeof data.revision === "string" ? data.revision : revision,
      pendingSync: hasUnsavedChanges(),
    });
    return "ok";
  }

  saveRequested = true;
  if (res.status === 409) {
    const data = await readJson(res);
    if (typeof data.revision === "string" && attemptedRevisions.has(data.revision)) {
      // An earlier attempt of ours did reach the server but its response got
      // lost. Continue from that revision and send the latest state again.
      usePresentationStore.setState({ revision: data.revision });
      return "ok";
    }
    return "conflict";
  }
  return stepResultForStatus(res.status);
}

async function runSync(): Promise<void> {
  const { setState } = usePresentationStore;
  let failures = 0;
  let rateLimitWaits = 0;

  for (;;) {
    const deletes = readPendingDeletes();
    if (deletes.length === 0 && !saveRequested) break;

    if (usePresentationStore.getState().syncStatus !== "saving") {
      setState({ syncStatus: "saving" });
    }

    // Deletions go first: they are small requests that work even when the
    // full save is slow or rejected.
    const result = deletes.length > 0 ? await pushDeletes(deletes) : await pushSave();

    if (result === "ok") {
      failures = 0;
      continue;
    }
    if (result === "conflict") {
      // Another tab or device saved in the meantime. Its copy wins; this tab
      // reloads instead of overwriting it with stale data.
      cancelScheduledSave();
      saveRequested = false;
      const loaded = await pullFromServer({ force: true }).catch(() => false);
      failures++;
      if (!loaded || failures >= MAX_SYNC_ATTEMPTS) {
        setState({ syncStatus: "error" });
        return;
      }
      // Local data is only kept when the server had nothing to load; it then
      // still has to be saved on top of the revision just fetched.
      saveRequested = usePresentationStore.getState().pendingSync;
      continue;
    }
    if (result === "rate-limited" && rateLimitWaits < MAX_RATE_LIMIT_WAITS) {
      // Too many requests in a short time (e.g. deleting many presentations
      // in a row). Wait for the limit to clear; whatever piles up meanwhile
      // goes out together in the next request.
      rateLimitWaits++;
      await new Promise((r) => setTimeout(r, RATE_LIMIT_BACKOFF_MS));
      continue;
    }
    failures++;
    if (result !== "retry" || failures >= MAX_SYNC_ATTEMPTS) {
      setState({ syncStatus: "error" });
      return;
    }
    // Exponential backoff: 1s, 2s, 4s
    await new Promise((r) => setTimeout(r, 1000 * 2 ** (failures - 1)));
  }

  attemptedRevisions.clear();
  setState({ syncStatus: "saved", syncErrorStatus: null });
}

function normalizePresentations(presentations: Presentation[]): Presentation[] {
  return presentations.map((p) => ({
    ...p,
    slides: p.slides.map((sl) => normalizeSlide(sl as unknown as Record<string, unknown>) as unknown as Slide),
  }));
}

/**
 * Fetches the server copy and reconciles it with local state. Returns false
 * when the server could not be reached.
 *
 * The server copy wins, except when local state has unsynced changes made on
 * top of the very revision the server still has — then nothing newer exists
 * and the local changes are pushed instead (unless `force` is set).
 */
async function pullFromServer({ force = false } = {}): Promise<boolean> {
  const { getState, setState } = usePresentationStore;

  const res = await fetch("/api/presentations");
  if (!res.ok) return false;
  const data = await readJson(res);
  // Anything else (e.g. a login page after the session expired) is not an answer.
  if (!("presentations" in data)) return false;
  const serverRevision = typeof data.revision === "string" ? data.revision : null;
  const serverPresentations = Array.isArray(data.presentations)
    ? normalizePresentations(data.presentations as Presentation[])
    : [];

  const local = getState();
  if (!force && local.pendingSync && local.revision === serverRevision) {
    void local.saveToServer();
    return true;
  }

  // Never bring back presentations whose deletion is still on its way.
  const pendingDeletes = new Set(readPendingDeletes());
  const incoming = serverPresentations.filter((p) => !pendingDeletes.has(p.id));

  if (incoming.length === 0) {
    // Nothing stored on the server yet: keep working with local data.
    setState({ revision: serverRevision });
    return true;
  }

  setState((s) => ({
    presentations: incoming,
    activePresentationId:
      s.activePresentationId && incoming.some((p) => p.id === s.activePresentationId)
        ? s.activePresentationId
        : incoming[0].id,
    revision: serverRevision,
    pendingSync: hasUnsavedChanges(),
    syncStatus: "saved",
    syncErrorStatus: null,
  }));
  return true;
}

// --- Safe localStorage wrapper ---

const safeStorage: PersistStorage<PersistedSlice> = {
  getItem(name) {
    try {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      return JSON.parse(raw) as StorageValue<PersistedSlice>;
    } catch {
      console.warn("Failed to read localStorage, starting fresh");
      return null;
    }
  },
  setItem(name, value) {
    try {
      localStorage.setItem(name, JSON.stringify(value));
    } catch (e) {
      console.error("localStorage write failed (likely quota exceeded):", e);
      usePresentationStore.setState({ storageWarning: true });
    }
  },
  removeItem(name) {
    try {
      localStorage.removeItem(name);
    } catch {}
  },
};

type PersistedSlice = Pick<
  PresentationState,
  "presentations" | "activePresentationId" | "revision" | "pendingSync"
>;

interface PresentationState {
  presentations: Presentation[];
  activePresentationId: string | null;
  isPresentationMode: boolean;

  // Cloud sync
  syncStatus: SyncStatus;
  /** HTTP status of the last failed sync request; null for network errors. */
  syncErrorStatus: number | null;
  /** Server revision the local presentations were last synced with. */
  revision: string | null;
  /** True while local changes have not been confirmed by the server. */
  pendingSync: boolean;
  storageWarning: boolean;

  // Derived
  getActivePresentation: () => Presentation | undefined;
  getActiveSlide: () => Slide | undefined;

  // Presentation actions
  addPresentation: () => boolean;
  deletePresentation: (id: string) => void;
  deleteAllPresentations: () => void;
  renamePresentation: (id: string, name: string) => void;
  setActivePresentation: (id: string) => void;
  importPresentation: (presentation: Presentation) => boolean;

  // Slide actions
  addSlide: (type: SlideType) => void;
  removeSlide: (index: number) => void;
  updateSlide: (index: number, patch: Partial<CodeSlide> | Partial<ContentSlide> | Partial<MermaidSlide>) => void;
  setActiveSlideIndex: (index: number) => void;
  reorderSlide: (fromIndex: number, toIndex: number) => void;
  duplicateSlide: (index: number) => void;

  // Presentation mode
  togglePresentationMode: () => void;
  setPresentationMode: (on: boolean) => void;
  nextSlide: () => void;
  prevSlide: () => void;

  // Cloud sync
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
}

export const usePresentationStore = create<PresentationState>()(
  persist(
    (set, get) => {
      const defaultPres = createDefaultPresentation();

      return {
        presentations: [defaultPres],
        activePresentationId: defaultPres.id,
        isPresentationMode: false,
        syncStatus: "idle" as SyncStatus,
        syncErrorStatus: null,
        revision: null,
        pendingSync: false,
        storageWarning: false,

        getActivePresentation: () => {
          const { presentations, activePresentationId } = get();
          return presentations.find((p) => p.id === activePresentationId);
        },

        getActiveSlide: () => {
          const pres = get().getActivePresentation();
          if (!pres) return undefined;
          return pres.slides[pres.activeSlideIndex];
        },

        addPresentation: () => {
          if (get().presentations.length >= MAX_PRESENTATIONS) return false;

          const newPres = createDefaultPresentation();
          set((s) => ({
            presentations: [...s.presentations, newPres],
            activePresentationId: newPres.id,
          }));
          scheduleSave();
          return true;
        },

        deletePresentation: (id) => {
          if (!get().presentations.some((p) => p.id === id)) return;
          // Recorded before the state change so a reload can replay it.
          addPendingDeletes([id]);

          let needsSave = false;
          set((s) => {
            const filtered = s.presentations.filter((p) => p.id !== id);
            if (filtered.length === 0) {
              const fallback = createDefaultPresentation();
              needsSave = true;
              return {
                presentations: [fallback],
                activePresentationId: fallback.id,
                pendingSync: true,
              };
            }
            return {
              presentations: filtered,
              activePresentationId:
                s.activePresentationId === id ? filtered[0].id : s.activePresentationId,
            };
          });

          // The deletion itself is sent immediately as its own small request.
          // A full save only follows if there is something else to write.
          if (needsSave || get().pendingSync) void get().saveToServer();
          else void startSync();
        },

        deleteAllPresentations: () => {
          addPendingDeletes(get().presentations.map((p) => p.id));
          const fallback = createDefaultPresentation();
          set({
            presentations: [fallback],
            activePresentationId: fallback.id,
            pendingSync: true,
          });
          void get().saveToServer();
        },

        renamePresentation: (id, name) => {
          set((s) => ({
            presentations: s.presentations.map((p) =>
              p.id === id ? { ...p, name } : p
            ),
          }));
          scheduleSave();
        },

        setActivePresentation: (id) => {
          set({ activePresentationId: id });
          scheduleSave();
        },

        importPresentation: (presentation) => {
          if (get().presentations.length >= MAX_PRESENTATIONS) return false;

          set((s) => ({
            presentations: [...s.presentations, presentation],
            activePresentationId: presentation.id,
          }));
          scheduleSave();
          return true;
        },

        addSlide: (type) => {
          const slide: Slide = createDefaultSlide(type);

          set((s) => ({
            presentations: s.presentations.map((p) => {
              if (p.id !== s.activePresentationId) return p;
              const newSlides = [...p.slides, slide];
              return {
                ...p,
                slides: newSlides,
                activeSlideIndex: newSlides.length - 1,
              };
            }),
          }));
          scheduleSave();
        },

        removeSlide: (index) => {
          set((s) => ({
            presentations: s.presentations.map((p) => {
              if (p.id !== s.activePresentationId) return p;
              if (p.slides.length <= 1) return p;
              const newSlides = p.slides.filter((_, i) => i !== index);
              return {
                ...p,
                slides: newSlides,
                activeSlideIndex: Math.min(p.activeSlideIndex, newSlides.length - 1),
              };
            }),
          }));
          scheduleSave();
        },

        updateSlide: (index, patch) => {
          set((s) => ({
            presentations: s.presentations.map((p) => {
              if (p.id !== s.activePresentationId) return p;
              const slide = p.slides[index];
              if (!slide) return p;
              const newSlides = [...p.slides];
              newSlides[index] = { ...slide, ...patch } as Slide;
              return { ...p, slides: newSlides };
            }),
          }));
          scheduleSave();
        },

        setActiveSlideIndex: (index) => {
          set((s) => ({
            presentations: s.presentations.map((p) => {
              if (p.id !== s.activePresentationId) return p;
              return { ...p, activeSlideIndex: Math.max(0, Math.min(index, p.slides.length - 1)) };
            }),
          }));
        },

        reorderSlide: (fromIndex, toIndex) => {
          set((s) => ({
            presentations: s.presentations.map((p) => {
              if (p.id !== s.activePresentationId) return p;
              const newSlides = [...p.slides];
              const [moved] = newSlides.splice(fromIndex, 1);
              newSlides.splice(toIndex, 0, moved);
              return { ...p, slides: newSlides, activeSlideIndex: toIndex };
            }),
          }));
          scheduleSave();
        },

        duplicateSlide: (index) => {
          set((s) => ({
            presentations: s.presentations.map((p) => {
              if (p.id !== s.activePresentationId) return p;
              const source = p.slides[index];
              if (!source) return p;
              const clone = { ...source, id: generateId() } as Slide;
              const newSlides = [...p.slides];
              newSlides.splice(index + 1, 0, clone);
              return { ...p, slides: newSlides, activeSlideIndex: index + 1 };
            }),
          }));
          scheduleSave();
        },

        togglePresentationMode: () => {
          set((s) => ({ isPresentationMode: !s.isPresentationMode }));
        },

        setPresentationMode: (on) => {
          set({ isPresentationMode: on });
        },

        nextSlide: () => {
          const pres = get().getActivePresentation();
          if (!pres) return;
          const next = Math.min(pres.activeSlideIndex + 1, pres.slides.length - 1);
          get().setActiveSlideIndex(next);
        },

        prevSlide: () => {
          const pres = get().getActivePresentation();
          if (!pres) return;
          const prev = Math.max(pres.activeSlideIndex - 1, 0);
          get().setActiveSlideIndex(prev);
        },

        loadFromServer: async () => {
          try {
            if (syncInFlight) await syncInFlight;

            // Replay deletions that never reached the server (tab closed or
            // reloaded too early) so the copy loaded below doesn't bring the
            // deleted presentations back.
            const pendingDeletes = readPendingDeletes();
            if (pendingDeletes.length > 0) await pushDeletes(pendingDeletes);

            await pullFromServer();
          } catch {
            // Server unreachable — continue with localStorage data
            console.warn("Could not load from server, using local data");
          }
        },

        saveToServer: () => {
          cancelScheduledSave();
          saveRequested = true;
          if (!get().pendingSync) set({ pendingSync: true });
          return startSync();
        },
      };
    },
    {
      name: "slidedude-presentations",
      storage: safeStorage,
      // Defer rehydration to a useEffect on the client so SSR and the first
      // client render produce identical markup (avoiding hydration mismatches).
      skipHydration: true,
      partialize: (state) => ({
        presentations: state.presentations,
        activePresentationId: state.activePresentationId,
        revision: state.revision,
        pendingSync: state.pendingSync,
      }),
      onRehydrateStorage: () => (rehydratedState) => {
        // Migrate any presentation that was saved with the legacy
        // imageDataUrl field before the imageDataUrls array was introduced.
        if (!rehydratedState) return;
        rehydratedState.presentations = rehydratedState.presentations.map((p) => ({
          ...p,
          slides: p.slides.map((sl) => normalizeSlide(sl as unknown as Record<string, unknown>) as unknown as Slide),
        }));
      },
    }
  )
);
