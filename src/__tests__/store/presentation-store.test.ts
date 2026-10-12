import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePresentationStore } from "@/store/presentation-store";
import { MAX_PRESENTATIONS } from "@/lib/validation";

// Mock fetch for saveToServer / loadFromServer
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  // Reset store to fresh state
  usePresentationStore.setState({
    presentations: [
      {
        id: "pres-1",
        name: "Test Presentation",
        slides: [
          {
            id: "slide-1",
            type: "code",
            title: "First",
            code: "const a = 1;",
            language: "typescript",
          },
        ],
        activeSlideIndex: 0,
      },
    ],
    activePresentationId: "pres-1",
    syncStatus: "idle",
    syncErrorStatus: null,
    revision: null,
    pendingSync: false,
    storageWarning: false,
    isPresentationMode: false,
  });
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
  localStorage.clear();
});

afterEach(async () => {
  // Let any sync started by the test settle (and cancel debounced saves) so
  // it can't consume the next test's fetch mocks.
  vi.useRealTimers();
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });
  await usePresentationStore.getState().saveToServer();
});

const PENDING_DELETES_KEY = "slidedude-pending-deletes";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function makePresentation(id: string, name = id) {
  return {
    id,
    name,
    slides: [{ id: `${id}-slide`, type: "code" as const, title: "T", code: "x", language: "ts" }],
    activeSlideIndex: 0,
  };
}

function requestsWithMethod(method: string) {
  return mockFetch.mock.calls.filter(([, init]) => (init?.method ?? "GET") === method);
}

describe("presentation store", () => {
  describe("getActivePresentation", () => {
    it("returns the active presentation", () => {
      const pres = usePresentationStore.getState().getActivePresentation();
      expect(pres).toBeDefined();
      expect(pres!.name).toBe("Test Presentation");
    });

    it("returns undefined when no match", () => {
      usePresentationStore.setState({ activePresentationId: "nonexistent" });
      expect(usePresentationStore.getState().getActivePresentation()).toBeUndefined();
    });
  });

  describe("getActiveSlide", () => {
    it("returns the current slide", () => {
      const slide = usePresentationStore.getState().getActiveSlide();
      expect(slide).toBeDefined();
      expect(slide!.id).toBe("slide-1");
    });
  });

  describe("addSlide", () => {
    it("adds a code slide and activates it", () => {
      usePresentationStore.getState().addSlide("code");
      const pres = usePresentationStore.getState().getActivePresentation()!;
      expect(pres.slides).toHaveLength(2);
      expect(pres.slides[1].type).toBe("code");
      expect(pres.activeSlideIndex).toBe(1);
    });

    it("adds a content slide", () => {
      usePresentationStore.getState().addSlide("content");
      const pres = usePresentationStore.getState().getActivePresentation()!;
      expect(pres.slides).toHaveLength(2);
      expect(pres.slides[1].type).toBe("content");
    });

    it("adds a mermaid slide with a default source", () => {
      usePresentationStore.getState().addSlide("mermaid");
      const pres = usePresentationStore.getState().getActivePresentation()!;
      expect(pres.slides).toHaveLength(2);
      const slide = pres.slides[1];
      expect(slide.type).toBe("mermaid");
      if (slide.type === "mermaid") {
        expect(slide.source.length).toBeGreaterThan(0);
      }
    });
  });

  describe("removeSlide", () => {
    it("removes a slide by index", () => {
      usePresentationStore.getState().addSlide("code");
      usePresentationStore.getState().removeSlide(0);
      const pres = usePresentationStore.getState().getActivePresentation()!;
      expect(pres.slides).toHaveLength(1);
    });

    it("does not remove the last slide", () => {
      usePresentationStore.getState().removeSlide(0);
      const pres = usePresentationStore.getState().getActivePresentation()!;
      expect(pres.slides).toHaveLength(1);
    });

    it("adjusts activeSlideIndex when needed", () => {
      usePresentationStore.getState().addSlide("code");
      usePresentationStore.getState().setActiveSlideIndex(1);
      usePresentationStore.getState().removeSlide(1);
      const pres = usePresentationStore.getState().getActivePresentation()!;
      expect(pres.activeSlideIndex).toBeLessThanOrEqual(pres.slides.length - 1);
    });
  });

  describe("updateSlide", () => {
    it("patches a slide at the given index", () => {
      usePresentationStore.getState().updateSlide(0, { title: "Updated" });
      const slide = usePresentationStore.getState().getActiveSlide()!;
      expect(slide.title).toBe("Updated");
    });

    it("ignores out-of-bounds index", () => {
      usePresentationStore.getState().updateSlide(99, { title: "Nope" });
      const slide = usePresentationStore.getState().getActiveSlide()!;
      expect(slide.title).toBe("First");
    });
  });

  describe("reorderSlide", () => {
    it("moves a slide from one position to another", () => {
      usePresentationStore.getState().addSlide("content");
      const pres1 = usePresentationStore.getState().getActivePresentation()!;
      const firstId = pres1.slides[0].id;

      usePresentationStore.getState().reorderSlide(0, 1);
      const pres2 = usePresentationStore.getState().getActivePresentation()!;
      expect(pres2.slides[1].id).toBe(firstId);
      expect(pres2.activeSlideIndex).toBe(1);
    });
  });

  describe("duplicateSlide", () => {
    it("duplicates a slide with a new id", () => {
      usePresentationStore.getState().duplicateSlide(0);
      const pres = usePresentationStore.getState().getActivePresentation()!;
      expect(pres.slides).toHaveLength(2);
      expect(pres.slides[0].id).not.toBe(pres.slides[1].id);
      expect(pres.slides[1].title).toBe(pres.slides[0].title);
      expect(pres.activeSlideIndex).toBe(1);
    });
  });

  describe("renamePresentation", () => {
    it("renames the presentation", () => {
      usePresentationStore.getState().renamePresentation("pres-1", "New Name");
      const pres = usePresentationStore.getState().getActivePresentation()!;
      expect(pres.name).toBe("New Name");
    });
  });

  describe("deletePresentation", () => {
    it("creates a new default when deleting the last one", () => {
      usePresentationStore.getState().deletePresentation("pres-1");
      const state = usePresentationStore.getState();
      expect(state.presentations).toHaveLength(1);
      expect(state.activePresentationId).toBeTruthy();
    });
  });

  describe("presentation limits", () => {
    it("does not import beyond the max presentation count", () => {
      const presentations = Array.from({ length: MAX_PRESENTATIONS }, (_, index) => ({
        id: `pres-${index}`,
        name: `Presentation ${index}`,
        slides: [
          {
            id: `slide-${index}`,
            type: "code" as const,
            title: "Slide",
            code: "const x = 1;",
            language: "typescript",
          },
        ],
        activeSlideIndex: 0,
      }));

      usePresentationStore.setState({ presentations, activePresentationId: presentations[0].id });

      const added = usePresentationStore.getState().importPresentation({
        id: "overflow",
        name: "Overflow",
        slides: [
          {
            id: "overflow-slide",
            type: "code",
            title: "Overflow",
            code: "const y = 2;",
            language: "typescript",
          },
        ],
        activeSlideIndex: 0,
      });

      expect(added).toBe(false);
      expect(usePresentationStore.getState().presentations).toHaveLength(MAX_PRESENTATIONS);
    });

    it("deletes all presentations and leaves one blank fallback", () => {
      usePresentationStore.getState().importPresentation({
        id: "pres-2",
        name: "Second",
        slides: [
          {
            id: "slide-2",
            type: "content",
            title: "Second",
            body: "Body",
            imageDataUrls: [],
            fontSize: 32,
          },
        ],
        activeSlideIndex: 0,
      });

      usePresentationStore.getState().deleteAllPresentations();
      const state = usePresentationStore.getState();

      expect(state.presentations).toHaveLength(1);
      expect(state.activePresentationId).toBe(state.presentations[0].id);
      expect(state.presentations[0].name).toBe("Untitled Presentation");
    });
  });

  describe("navigation", () => {
    it("nextSlide advances the index", () => {
      usePresentationStore.getState().addSlide("code");
      usePresentationStore.getState().setActiveSlideIndex(0);
      usePresentationStore.getState().nextSlide();
      const pres = usePresentationStore.getState().getActivePresentation()!;
      expect(pres.activeSlideIndex).toBe(1);
    });

    it("nextSlide does not go past the last slide", () => {
      usePresentationStore.getState().nextSlide();
      const pres = usePresentationStore.getState().getActivePresentation()!;
      expect(pres.activeSlideIndex).toBe(0);
    });

    it("prevSlide goes back", () => {
      usePresentationStore.getState().addSlide("code");
      usePresentationStore.getState().nextSlide();
      usePresentationStore.getState().prevSlide();
      const pres = usePresentationStore.getState().getActivePresentation()!;
      expect(pres.activeSlideIndex).toBe(0);
    });

    it("prevSlide does not go below zero", () => {
      usePresentationStore.getState().prevSlide();
      const pres = usePresentationStore.getState().getActivePresentation()!;
      expect(pres.activeSlideIndex).toBe(0);
    });
  });

  describe("saveToServer", () => {
    it("sets syncStatus to saved on success", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      await usePresentationStore.getState().saveToServer();
      expect(usePresentationStore.getState().syncStatus).toBe("saved");
    });

    it("sets syncStatus to error on 4xx (no retry)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });
      await usePresentationStore.getState().saveToServer();
      expect(usePresentationStore.getState().syncStatus).toBe("error");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("retries on 5xx then succeeds", async () => {
      vi.useFakeTimers();
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true });

      const promise = usePresentationStore.getState().saveToServer();
      await vi.advanceTimersByTimeAsync(1000);
      await promise;
      expect(usePresentationStore.getState().syncStatus).toBe("saved");
      expect(mockFetch).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it("sets syncStatus to error after all retries exhausted", async () => {
      vi.useFakeTimers();
      mockFetch.mockRejectedValue(new Error("Network error"));

      const promise = usePresentationStore.getState().saveToServer();
      await vi.advanceTimersByTimeAsync(1000); // retry 1
      await vi.advanceTimersByTimeAsync(2000); // retry 2
      await promise;
      expect(usePresentationStore.getState().syncStatus).toBe("error");
      expect(mockFetch).toHaveBeenCalledTimes(3);
      vi.useRealTimers();
    });
  });

  describe("loadFromServer", () => {
    it("loads presentations from server", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          presentations: [
            {
              id: "server-pres",
              name: "From Server",
              slides: [
                { id: "s1", type: "code", title: "A", code: "x", language: "js" },
              ],
              activeSlideIndex: 0,
            },
          ],
        }),
      });

      await usePresentationStore.getState().loadFromServer();
      const state = usePresentationStore.getState();
      expect(state.presentations).toHaveLength(1);
      expect(state.presentations[0].name).toBe("From Server");
    });

    it("keeps local data when server is unreachable", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      await usePresentationStore.getState().loadFromServer();
      const state = usePresentationStore.getState();
      expect(state.presentations[0].name).toBe("Test Presentation");
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("migrates legacy imageDataUrl when loading from server", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          presentations: [
            {
              id: "p-legacy",
              name: "Legacy",
              activeSlideIndex: 0,
              slides: [
                {
                  id: "s1",
                  type: "content",
                  title: "Old",
                  body: "Body",
                  fontSize: 32,
                  imageDataUrl: "data:image/webp;base64,abc",
                },
              ],
            },
          ],
        }),
      });
      await usePresentationStore.getState().loadFromServer();
      const pres = usePresentationStore.getState().presentations[0];
      const slide = pres.slides[0] as import("@/types").ContentSlide;
      expect(slide.imageDataUrls).toEqual(["data:image/webp;base64,abc"]);
      expect("imageDataUrl" in slide).toBe(false);
    });
  });

  describe("sync: saving", () => {
    it("sends the base revision and adopts the one returned by the server", async () => {
      usePresentationStore.setState({ revision: "rev-1" });
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true, revision: "rev-2" }));

      await usePresentationStore.getState().saveToServer();

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.baseRevision).toBe("rev-1");
      const state = usePresentationStore.getState();
      expect(state.revision).toBe("rev-2");
      expect(state.pendingSync).toBe(false);
      expect(state.syncStatus).toBe("saved");
    });

    it("keeps the changes pending when the save fails", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: "Payload too large" }, 413));

      await usePresentationStore.getState().saveToServer();

      const state = usePresentationStore.getState();
      expect(state.syncStatus).toBe("error");
      expect(state.syncErrorStatus).toBe(413);
      expect(state.pendingSync).toBe(true);
    });

    it("retries with the latest state instead of a stale snapshot", async () => {
      vi.useFakeTimers();
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
        .mockResolvedValueOnce(jsonResponse({ ok: true, revision: "rev-2" }));

      const promise = usePresentationStore.getState().saveToServer();
      usePresentationStore.getState().renamePresentation("pres-1", "Renamed during retry");
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      const retried = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(retried.presentations[0].name).toBe("Renamed during retry");
      vi.useRealTimers();
    });

    it("runs one save at a time and follows up with changes made meanwhile", async () => {
      let resolveFirst: (value: unknown) => void = () => {};
      mockFetch
        .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
        .mockResolvedValueOnce(jsonResponse({ ok: true, revision: "rev-2" }));

      const first = usePresentationStore.getState().saveToServer();
      usePresentationStore.getState().renamePresentation("pres-1", "Second edit");
      const second = usePresentationStore.getState().saveToServer();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      resolveFirst(jsonResponse({ ok: true, revision: "rev-1" }));
      await Promise.all([first, second]);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      const followUp = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(followUp.baseRevision).toBe("rev-1");
      expect(followUp.presentations[0].name).toBe("Second edit");
      expect(usePresentationStore.getState().pendingSync).toBe(false);
    });

    it("reloads the server copy on a conflict instead of overwriting it", async () => {
      usePresentationStore.setState({ revision: "rev-1" });
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ error: "Conflict", revision: "rev-5" }, 409))
        .mockResolvedValueOnce(
          jsonResponse({ presentations: [makePresentation("other", "From other tab")], revision: "rev-5" }),
        );

      await usePresentationStore.getState().saveToServer();

      const state = usePresentationStore.getState();
      expect(state.presentations.map((p) => p.name)).toEqual(["From other tab"]);
      expect(state.revision).toBe("rev-5");
      expect(state.pendingSync).toBe(false);
      expect(state.syncStatus).toBe("saved");
      expect(requestsWithMethod("PUT")).toHaveLength(1);
    });

    it("recognises its own write when the response was lost", async () => {
      vi.useFakeTimers();
      usePresentationStore.setState({ revision: "rev-1" });
      mockFetch
        .mockRejectedValueOnce(new Error("connection dropped"))
        .mockImplementationOnce(async () => {
          // The first attempt did reach the server: report its revision as current.
          const firstAttempt = JSON.parse(mockFetch.mock.calls[0][1].body);
          return jsonResponse({ error: "Conflict", revision: firstAttempt.revision }, 409);
        })
        .mockResolvedValueOnce(jsonResponse({ ok: true, revision: "rev-3" }));

      const promise = usePresentationStore.getState().saveToServer();
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      expect(requestsWithMethod("GET")).toHaveLength(0);
      const state = usePresentationStore.getState();
      expect(state.presentations[0].name).toBe("Test Presentation");
      expect(state.revision).toBe("rev-3");
      expect(state.syncStatus).toBe("saved");
      vi.useRealTimers();
    });
  });

  describe("sync: deleting", () => {
    beforeEach(() => {
      usePresentationStore.setState({
        presentations: [makePresentation("pres-1"), makePresentation("pres-2")],
        activePresentationId: "pres-1",
        revision: "rev-1",
      });
    });

    it("sends the deletion immediately as its own request", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true, revision: "rev-2", previousRevision: "rev-1" }));

      usePresentationStore.getState().deletePresentation("pres-2");
      expect(JSON.parse(localStorage.getItem(PENDING_DELETES_KEY)!)).toEqual(["pres-2"]);
      await vi.waitFor(() => expect(usePresentationStore.getState().syncStatus).toBe("saved"));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe("/api/presentations?id=pres-2");
      expect(init.method).toBe("DELETE");
      expect(usePresentationStore.getState().revision).toBe("rev-2");
      expect(localStorage.getItem(PENDING_DELETES_KEY)).toBeNull();
    });

    it("keeps the deletion pending when the request fails", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: "nope" }, 401));

      usePresentationStore.getState().deletePresentation("pres-2");
      await vi.waitFor(() => expect(usePresentationStore.getState().syncStatus).toBe("error"));

      expect(JSON.parse(localStorage.getItem(PENDING_DELETES_KEY)!)).toEqual(["pres-2"]);
      expect(usePresentationStore.getState().presentations.map((p) => p.id)).toEqual(["pres-1"]);
    });

    it("waits and batches deletions when rate-limited", async () => {
      vi.useFakeTimers();
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ error: "Too many requests" }, 429))
        .mockResolvedValueOnce(jsonResponse({ ok: true, revision: "rev-2", previousRevision: "rev-1" }));
      usePresentationStore.setState((s) => ({
        presentations: [...s.presentations, makePresentation("pres-3")],
      }));

      usePresentationStore.getState().deletePresentation("pres-2");
      await vi.advanceTimersByTimeAsync(0);
      usePresentationStore.getState().deletePresentation("pres-3");
      await vi.advanceTimersByTimeAsync(15_000);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[1][0]).toBe("/api/presentations?id=pres-2&id=pres-3");
      expect(usePresentationStore.getState().syncStatus).toBe("saved");
      vi.useRealTimers();
    });

    it("replays pending deletions on load so they don't come back", async () => {
      // A previous session deleted pres-2 but the request never went through.
      localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(["pres-2"]));
      usePresentationStore.setState({ presentations: [makePresentation("pres-1")] });
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ ok: true, revision: "rev-2", previousRevision: "rev-1" }))
        .mockResolvedValueOnce(jsonResponse({ presentations: [makePresentation("pres-1")], revision: "rev-2" }));

      await usePresentationStore.getState().loadFromServer();

      expect(mockFetch.mock.calls[0][0]).toBe("/api/presentations?id=pres-2");
      expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
      expect(usePresentationStore.getState().presentations.map((p) => p.id)).toEqual(["pres-1"]);
      expect(localStorage.getItem(PENDING_DELETES_KEY)).toBeNull();
    });

    it("hides presentations whose deletion could not be replayed yet", async () => {
      localStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(["pres-2"]));
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
        .mockResolvedValueOnce(
          jsonResponse({ presentations: [makePresentation("pres-1"), makePresentation("pres-2")], revision: "rev-1" }),
        );

      await usePresentationStore.getState().loadFromServer();

      expect(usePresentationStore.getState().presentations.map((p) => p.id)).toEqual(["pres-1"]);
      expect(JSON.parse(localStorage.getItem(PENDING_DELETES_KEY)!)).toEqual(["pres-2"]);
    });

    it("deletes everything on the server before saving the blank fallback", async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ ok: true, revision: "rev-2", previousRevision: "rev-1" }))
        .mockResolvedValueOnce(jsonResponse({ ok: true, revision: "rev-3" }));

      usePresentationStore.getState().deleteAllPresentations();
      await vi.waitFor(() => expect(usePresentationStore.getState().syncStatus).toBe("saved"));

      expect(mockFetch.mock.calls[0][0]).toBe("/api/presentations?id=pres-1&id=pres-2");
      expect(mockFetch.mock.calls[1][1].method).toBe("PUT");
      const saved = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(saved.baseRevision).toBe("rev-2");
      expect(saved.presentations).toHaveLength(1);
    });
  });

  describe("sync: loading", () => {
    it("pushes unsynced local changes when the server has nothing newer", async () => {
      usePresentationStore.setState({ revision: "rev-1", pendingSync: true });
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ presentations: [makePresentation("pres-1", "Old name")], revision: "rev-1" }))
        .mockResolvedValueOnce(jsonResponse({ ok: true, revision: "rev-2" }));

      await usePresentationStore.getState().loadFromServer();
      await vi.waitFor(() => expect(usePresentationStore.getState().syncStatus).toBe("saved"));

      expect(usePresentationStore.getState().presentations[0].name).toBe("Test Presentation");
      const saved = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(saved.presentations[0].name).toBe("Test Presentation");
      expect(usePresentationStore.getState().pendingSync).toBe(false);
    });

    it("lets the server win when it changed since the last sync", async () => {
      usePresentationStore.setState({ revision: "rev-1", pendingSync: true });
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ presentations: [makePresentation("pres-1", "Newer on server")], revision: "rev-7" }),
      );

      await usePresentationStore.getState().loadFromServer();

      const state = usePresentationStore.getState();
      expect(state.presentations[0].name).toBe("Newer on server");
      expect(state.revision).toBe("rev-7");
      expect(state.pendingSync).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
