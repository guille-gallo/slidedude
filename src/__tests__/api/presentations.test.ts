import { describe, it, expect, vi, beforeEach } from "vitest";

const authMock = vi.fn();
const getPresentationsMock = vi.fn();
const savePresentationsMock = vi.fn();
const limitMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: () => authMock(),
}));

vi.mock("@/lib/data", () => ({
  getPresentations: (...args: unknown[]) => getPresentationsMock(...args),
  savePresentations: (...args: unknown[]) => savePresentationsMock(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: { limit: (...args: unknown[]) => limitMock(...args) },
}));

import { GET, PUT } from "@/app/api/presentations/route";

const validPresentations = [
  {
    id: "p1",
    name: "Demo",
    slides: [
      { id: "s1", type: "code", title: "T", code: "x", language: "ts" },
    ],
    activeSlideIndex: 0,
  },
];

beforeEach(() => {
  authMock.mockReset();
  getPresentationsMock.mockReset();
  savePresentationsMock.mockReset();
  limitMock.mockReset().mockResolvedValue({ success: true });
});

describe("GET /api/presentations", () => {
  it("returns 401 when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no email", async () => {
    authMock.mockResolvedValueOnce({ user: {} });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    authMock.mockResolvedValueOnce({ user: { email: "a@b.co" } });
    limitMock.mockResolvedValueOnce({ success: false });
    const res = await GET();
    expect(res.status).toBe(429);
  });

  it("returns presentations when authenticated", async () => {
    authMock.mockResolvedValueOnce({ user: { email: "a@b.co" } });
    getPresentationsMock.mockResolvedValueOnce(validPresentations);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.presentations).toEqual(validPresentations);
  });

  it("returns 500 when data layer throws", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValueOnce({ user: { email: "a@b.co" } });
    getPresentationsMock.mockRejectedValueOnce(new Error("redis down"));
    const res = await GET();
    expect(res.status).toBe(500);
    errSpy.mockRestore();
  });
});

function makePutRequest(body: unknown, headers: Record<string, string> = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("http://localhost/api/presentations", {
    method: "PUT",
    body: text,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("PUT /api/presentations", () => {
  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const res = await PUT(makePutRequest({ presentations: validPresentations }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate-limited", async () => {
    authMock.mockResolvedValueOnce({ user: { email: "a@b.co" } });
    limitMock.mockResolvedValueOnce({ success: false });
    const res = await PUT(makePutRequest({ presentations: validPresentations }));
    expect(res.status).toBe(429);
  });

  it("returns 413 when content-length exceeds max", async () => {
    authMock.mockResolvedValueOnce({ user: { email: "a@b.co" } });
    const big = (5 * 1024 * 1024 + 1).toString();
    const res = await PUT(
      makePutRequest({ presentations: validPresentations }, { "content-length": big }),
    );
    expect(res.status).toBe(413);
  });

  it("returns 400 on invalid JSON", async () => {
    authMock.mockResolvedValueOnce({ user: { email: "a@b.co" } });
    const res = await PUT(makePutRequest("not json"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when presentations payload is invalid", async () => {
    authMock.mockResolvedValueOnce({ user: { email: "a@b.co" } });
    const res = await PUT(makePutRequest({ presentations: "nope" }));
    expect(res.status).toBe(400);
  });

  it("saves and returns ok for valid payload", async () => {
    authMock.mockResolvedValueOnce({ user: { email: "a@b.co" } });
    savePresentationsMock.mockResolvedValueOnce(undefined);
    const res = await PUT(makePutRequest({ presentations: validPresentations }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(savePresentationsMock).toHaveBeenCalledWith("a@b.co", validPresentations);
  });

  it("returns 500 when save throws", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    authMock.mockResolvedValueOnce({ user: { email: "a@b.co" } });
    savePresentationsMock.mockRejectedValueOnce(new Error("redis down"));
    const res = await PUT(makePutRequest({ presentations: validPresentations }));
    expect(res.status).toBe(500);
    errSpy.mockRestore();
  });
});
