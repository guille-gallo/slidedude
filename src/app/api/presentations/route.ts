import { auth } from "@/auth";
import { getPresentations, savePresentations } from "@/lib/data";
import type { Presentation } from "@/types";

function isValidPresentations(data: unknown): data is Presentation[] {
  return (
    Array.isArray(data) &&
    data.every(
      (p) =>
        p &&
        typeof p === "object" &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        Array.isArray(p.slides) &&
        typeof p.activeSlideIndex === "number",
    )
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const presentations = await getPresentations(session.user.email);
  return Response.json({ presentations });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { presentations } = body as { presentations?: unknown };

  if (!isValidPresentations(presentations)) {
    return Response.json({ error: "Invalid data" }, { status: 400 });
  }

  await savePresentations(session.user.email, presentations);
  return Response.json({ ok: true });
}
