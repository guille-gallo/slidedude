import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Presentation, Slide, CodeSlide, ContentSlide } from "@/types";
import { generateId } from "@/utils/id";

function createDefaultCodeSlide(): CodeSlide {
  return {
    id: generateId(),
    type: "code",
    title: "",
    code: 'const hello = "world";',
    language: "typescript",
    theme: "github-dark",
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

interface PresentationState {
  presentations: Presentation[];
  activePresentationId: string | null;
  isPresentationMode: boolean;

  // Derived
  getActivePresentation: () => Presentation | undefined;
  getActiveSlide: () => Slide | undefined;

  // Presentation actions
  addPresentation: () => void;
  deletePresentation: (id: string) => void;
  renamePresentaton: (id: string, name: string) => void;
  setActivePresentation: (id: string) => void;

  // Slide actions
  addSlide: (type: "code" | "content") => void;
  removeSlide: (index: number) => void;
  updateSlide: (index: number, patch: Partial<CodeSlide> | Partial<ContentSlide>) => void;
  setActiveSlideIndex: (index: number) => void;
  reorderSlide: (fromIndex: number, toIndex: number) => void;

  // Presentation mode
  togglePresentationMode: () => void;
  setPresentationMode: (on: boolean) => void;
  nextSlide: () => void;
  prevSlide: () => void;
}

export const usePresentationStore = create<PresentationState>()(
  persist(
    (set, get) => {
      const defaultPres = createDefaultPresentation();

      return {
        presentations: [defaultPres],
        activePresentationId: defaultPres.id,
        isPresentationMode: false,

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
        },

        renamePresentaton: (id, name) => {
          set((s) => ({
            presentations: s.presentations.map((p) =>
              p.id === id ? { ...p, name } : p
            ),
          }));
        },

        setActivePresentation: (id) => {
          set({ activePresentationId: id });
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
      };
    },
    {
      name: "slido-presentations",
      partialize: (state) => ({
        presentations: state.presentations,
        activePresentationId: state.activePresentationId,
      }),
    }
  )
);
