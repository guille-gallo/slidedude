import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import type { Presentation, Slide, CodeSlide, ContentSlide } from "@/types";
import { generateId } from "@/utils/id";

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
    imageDataUrl: null,
    fontSize: 32,
  };
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

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const state = usePresentationStore.getState();
    state.saveToServer();
  }, 4000);
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

type PersistedSlice = Pick<PresentationState, "presentations" | "activePresentationId">;

interface PresentationState {
  presentations: Presentation[];
  activePresentationId: string | null;
  isPresentationMode: boolean;

  // Cloud sync
  syncStatus: SyncStatus;
  storageWarning: boolean;

  // Derived
  getActivePresentation: () => Presentation | undefined;
  getActiveSlide: () => Slide | undefined;

  // Presentation actions
  addPresentation: () => void;
  deletePresentation: (id: string) => void;
  renamePresentation: (id: string, name: string) => void;
  setActivePresentation: (id: string) => void;
  importPresentation: (presentation: Presentation) => void;

  // Slide actions
  addSlide: (type: "code" | "content") => void;
  removeSlide: (index: number) => void;
  updateSlide: (index: number, patch: Partial<CodeSlide> | Partial<ContentSlide>) => void;
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
          const newPres = createDefaultPresentation();
          set((s) => ({
            presentations: [...s.presentations, newPres],
            activePresentationId: newPres.id,
          }));
          scheduleSave();
        },

        deletePresentation: (id) => {
          set((s) => {
            const filtered = s.presentations.filter((p) => p.id !== id);
            if (filtered.length === 0) {
              const fallback = createDefaultPresentation();
              return {
                presentations: [fallback],
                activePresentationId: fallback.id,
              };
            }
            return {
              presentations: filtered,
              activePresentationId:
                s.activePresentationId === id ? filtered[0].id : s.activePresentationId,
            };
          });
          scheduleSave();
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
          set((s) => ({
            presentations: [...s.presentations, presentation],
            activePresentationId: presentation.id,
          }));
          scheduleSave();
        },

        addSlide: (type) => {
          const slide: Slide =
            type === "code" ? createDefaultCodeSlide() : createDefaultContentSlide();

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
            const res = await fetch("/api/presentations");
            if (!res.ok) return;
            const { presentations } = await res.json();
            if (Array.isArray(presentations) && presentations.length > 0) {
              set((s) => ({
                presentations,
                activePresentationId: s.activePresentationId
                  && presentations.some((p: Presentation) => p.id === s.activePresentationId)
                  ? s.activePresentationId
                  : presentations[0].id,
                syncStatus: "saved",
              }));
            }
          } catch {
            // Server unreachable — continue with localStorage data
            console.warn("Could not load from server, using local data");
          }
        },

        saveToServer: async () => {
          const { presentations } = get();
          set({ syncStatus: "saving" });
          try {
            const res = await fetch("/api/presentations", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ presentations }),
            });
            set({ syncStatus: res.ok ? "saved" : "error" });
          } catch {
            set({ syncStatus: "error" });
          }
        },
      };
    },
    {
      name: "slidedude-presentations",
      storage: safeStorage,
      partialize: (state) => ({
        presentations: state.presentations,
        activePresentationId: state.activePresentationId,
      }),
    }
  )
);
