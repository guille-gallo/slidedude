import { describe, it, expect, vi, beforeEach } from "vitest";

const isEmailAllowedMock = vi.fn();

vi.mock("@/auth", () => ({
  isEmailAllowed: (email: string) => isEmailAllowedMock(email),
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
});
