import { auth } from "@/auth";
import { getPresentations, savePresentations } from "@/lib/data";
import { isValidPresentations } from "@/lib/validation";
import { apiRateLimit } from "@/lib/rate-limit";

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

async function checkRateLimit(email: string) {
  const { success } = await apiRateLimit.limit(email);
  return success;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(session.user.email))) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const presentations = await getPresentations(session.user.email);
    return Response.json({ presentations });
  } catch (e) {
    console.error("Failed to fetch presentations:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(session.user.email))) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  // Check payload size via Content-Length header
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return Response.json({ error: "Failed to read body" }, { status: 400 });
  }

  // Double-check actual body size (Content-Length can be spoofed)
  if (new TextEncoder().encode(rawText).byteLength > MAX_PAYLOAD_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { presentations } = body as { presentations?: unknown };

  if (!isValidPresentations(presentations)) {
    return Response.json({ error: "Invalid data" }, { status: 400 });
  }

  try {
    await savePresentations(session.user.email, presentations);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Failed to save presentations:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
