import { auth } from "@/auth";
import { getPresentations, savePresentations } from "@/lib/data";
import { isValidPresentations } from "@/lib/validation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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

  try {
    await savePresentations(session.user.email, presentations);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Failed to save presentations:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
