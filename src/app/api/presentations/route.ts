import { auth } from "@/auth";
import { deletePresentations, getPresentations, savePresentations } from "@/lib/data";
import { isValidPresentations, MAX_PRESENTATIONS } from "@/lib/validation";
import { apiRateLimit } from "@/lib/rate-limit";

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ID_LENGTH = 100;

function isValidRevision(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_ID_LENGTH;
}

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
    const { presentations, revision } = await getPresentations(session.user.email);
    return Response.json({ presentations, revision });
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

  const { presentations, baseRevision, revision } = (body ?? {}) as {
    presentations?: unknown;
    baseRevision?: unknown;
    revision?: unknown;
  };

  if (!isValidPresentations(presentations)) {
    return Response.json({ error: "Invalid data" }, { status: 400 });
  }
  // baseRevision is the revision the client last synced with (null = nothing
  // stored yet); revision is the id the client wants this write to get.
  if (baseRevision !== undefined && baseRevision !== null && !isValidRevision(baseRevision)) {
    return Response.json({ error: "Invalid data" }, { status: 400 });
  }
  if (revision !== undefined && !isValidRevision(revision)) {
    return Response.json({ error: "Invalid data" }, { status: 400 });
  }

  try {
    const result = await savePresentations(
      session.user.email,
      presentations,
      baseRevision ?? null,
      revision,
    );
    if (!result.ok) {
      // The stored data changed since this client last synced (another tab or
      // device). Refuse rather than overwrite it with a stale copy.
      return Response.json({ error: "Conflict", revision: result.revision }, { status: 409 });
    }
    return Response.json({ ok: true, revision: result.revision });
  } catch (e) {
    console.error("Failed to save presentations:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(session.user.email))) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  const ids = new URL(request.url).searchParams.getAll("id");
  if (
    ids.length === 0 ||
    ids.length > MAX_PRESENTATIONS ||
    ids.some((id) => id.length === 0 || id.length > MAX_ID_LENGTH)
  ) {
    return Response.json({ error: "Invalid data" }, { status: 400 });
  }

  try {
    const { revision, previousRevision } = await deletePresentations(session.user.email, ids);
    return Response.json({ ok: true, revision, previousRevision });
  } catch (e) {
    console.error("Failed to delete presentations:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
