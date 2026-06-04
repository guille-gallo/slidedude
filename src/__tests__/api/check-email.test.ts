import { describe, it, expect, vi, beforeEach } from "vitest";

const isEmailAllowedMock = vi.fn();

vi.mock("@/auth", () => ({
  isEmailAllowed: (email: string) => isEmailAllowedMock(email),
}));

const magicLinkRateLimitMock = vi.fn();
const magicLinkIpRateLimitMock = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  magicLinkRateLimit: {
    limit: (identifier: string) => magicLinkRateLimitMock(identifier),
  },
  magicLinkIpRateLimit: {
    limit: (identifier: string) => magicLinkIpRateLimitMock(identifier),
  },
}));

import { POST } from "@/app/api/auth/check-email/route";

function req(body: unknown) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Request("http://localhost/api/auth/check-email", {
    method: "POST",
    body: text,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  isEmailAllowedMock.mockReset();
  magicLinkRateLimitMock.mockReset();
  magicLinkIpRateLimitMock.mockReset();
  magicLinkRateLimitMock.mockResolvedValue({ success: true });
  magicLinkIpRateLimitMock.mockResolvedValue({ success: true });
});

describe("POST /api/auth/check-email", () => {
  it("returns 400 with allowed:false on invalid JSON", async () => {
    const res = await POST(req("not json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ allowed: false });
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ allowed: false });
  });

  it("returns 400 when email is not a string", async () => {
    const res = await POST(req({ email: 42 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email format is invalid", async () => {
    const res = await POST(req({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ allowed: false });
  });

  it("returns allowed:true when email is in allowlist", async () => {
    isEmailAllowedMock.mockReturnValueOnce(true);
    const res = await POST(req({ email: "ok@example.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ allowed: true });
    expect(isEmailAllowedMock).toHaveBeenCalledWith("ok@example.com");
  });

  it("returns allowed:false when email is rejected", async () => {
    isEmailAllowedMock.mockReturnValueOnce(false);
    const res = await POST(req({ email: "no@example.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ allowed: false });
  });

  it("returns 429 when email rate limit is exceeded", async () => {
    magicLinkRateLimitMock.mockResolvedValueOnce({ success: false });
    const res = await POST(req({ email: "test@example.com" }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      allowed: false,
      error: "Too many requests. Try again later.",
    });
  });

  it("returns 429 when IP rate limit is exceeded", async () => {
    magicLinkIpRateLimitMock.mockResolvedValueOnce({ success: false });
    const res = await POST(req({ email: "test@example.com" }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      allowed: false,
      error: "Too many requests. Try again later.",
    });
  });
});
