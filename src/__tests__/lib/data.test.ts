import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Minimal in-memory stand-in for the Upstash client. `eval` mirrors the
// compare-and-set script in src/lib/data.ts.
const store = new Map<string, unknown>();
let beforeEval: (() => void) | null = null;

vi.mock("@/lib/redis", () => ({
  redis: {
    mget: async (...keys: string[]) => keys.map((key) => store.get(key) ?? null),
    get: async (key: string) => store.get(key) ?? null,
    set: async (key: string, value: unknown, opts?: { nx?: boolean }) => {
      if (opts?.nx && store.has(key)) return null;
      store.set(key, value);
      return "OK";
    },
    eval: async (_script: string, keys: string[], args: string[]) => {
      const hook = beforeEval;
      beforeEval = null;
      hook?.();
      const [dataKey, revisionKey] = keys;
      const [expected, json, nextRevision] = args;
      const current = (store.get(revisionKey) as string | undefined) ?? null;
      if ((current ?? "") !== expected) return current;
      store.set(dataKey, JSON.parse(json));
      store.set(revisionKey, nextRevision);
      return nextRevision;
    },
  },
}));

import { deletePresentations, getPresentations, savePresentations } from "@/lib/data";

const USER = "a@b.co";
const DATA_KEY = `presentations:${USER}`;
const REVISION_KEY = `presentations-rev:${USER}`;

function makePresentation(id: string) {
  return {
    id,
    name: id,
    slides: [{ id: `${id}-slide`, type: "code" as const, title: "T", code: "x", language: "ts" }],
    activeSlideIndex: 0,
  };
}

beforeEach(() => {
  store.clear();
  beforeEval = null;
});

describe("getPresentations", () => {
  it("returns nulls when nothing is stored", async () => {
    expect(await getPresentations(USER)).toEqual({ presentations: null, revision: null });
  });

  it("assigns a revision to data stored before revisions existed", async () => {
    store.set(DATA_KEY, [makePresentation("p1")]);

    const first = await getPresentations(USER);
    const second = await getPresentations(USER);

    expect(first.presentations).toHaveLength(1);
    expect(first.revision).toEqual(expect.any(String));
    expect(second.revision).toBe(first.revision);
  });

  it("returns null presentations when the stored data is invalid", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    store.set(DATA_KEY, "garbage");
    const result = await getPresentations(USER);
    expect(result.presentations).toBeNull();
    warnSpy.mockRestore();
  });
});

describe("savePresentations", () => {
  it("writes when nothing is stored and the base revision is null", async () => {
    const result = await savePresentations(USER, [makePresentation("p1")], null, "rev-1");
    expect(result).toEqual({ ok: true, revision: "rev-1" });
    expect(store.get(REVISION_KEY)).toBe("rev-1");
  });

  it("rejects a write based on a stale revision and keeps the stored data", async () => {
    await savePresentations(USER, [makePresentation("p1")], null, "rev-1");
    await savePresentations(USER, [makePresentation("p2")], "rev-1", "rev-2");

    const stale = await savePresentations(USER, [makePresentation("p1")], "rev-1", "rev-3");

    expect(stale).toEqual({ ok: false, revision: "rev-2" });
    expect((await getPresentations(USER)).presentations?.map((p) => p.id)).toEqual(["p2"]);
  });

  it("throws on invalid data", async () => {
    await expect(
      savePresentations(USER, "nope" as unknown as never[], null),
    ).rejects.toThrow("Invalid presentations data");
  });
});

describe("deletePresentations", () => {
  beforeEach(async () => {
    await savePresentations(USER, [makePresentation("p1"), makePresentation("p2")], null, "rev-1");
  });

  it("removes the given ids and bumps the revision", async () => {
    const result = await deletePresentations(USER, ["p2"]);

    expect(result.previousRevision).toBe("rev-1");
    expect(result.revision).not.toBe("rev-1");
    expect((await getPresentations(USER)).presentations?.map((p) => p.id)).toEqual(["p1"]);
  });

  it("leaves the revision alone when no id matches", async () => {
    expect(await deletePresentations(USER, ["unknown"])).toEqual({
      revision: "rev-1",
      previousRevision: "rev-1",
    });
  });

  it("re-reads and retries when another write lands in between", async () => {
    beforeEval = () => {
      store.set(DATA_KEY, [makePresentation("p1"), makePresentation("p2"), makePresentation("p3")]);
      store.set(REVISION_KEY, "rev-other");
    };

    const result = await deletePresentations(USER, ["p2"]);

    expect(result.previousRevision).toBe("rev-other");
    expect((await getPresentations(USER)).presentations?.map((p) => p.id)).toEqual(["p1", "p3"]);
  });
});
