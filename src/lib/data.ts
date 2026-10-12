import "server-only";
import { redis } from "@/lib/redis";
import { isValidPresentations } from "@/lib/validation";
import { generateId } from "@/utils/id";
import type { Presentation } from "@/types";

function redisKey(userId: string) {
  return `presentations:${userId}`;
}

function revisionKey(userId: string) {
  return `presentations-rev:${userId}`;
}

/**
 * Writes the presentations and their new revision only if the stored revision
 * still matches the expected one ("" = no revision yet). Returns the revision
 * that is stored afterwards, so the caller can tell a win from a conflict.
 */
const COMPARE_AND_SET_SCRIPT = `
local current = redis.call("GET", KEYS[2])
if (current or "") ~= ARGV[1] then
  return current
end
redis.call("SET", KEYS[1], ARGV[2])
redis.call("SET", KEYS[2], ARGV[3])
return ARGV[3]
`;

const MAX_DELETE_ATTEMPTS = 3;

export interface StoredPresentations {
  presentations: Presentation[] | null;
  /** Opaque token that changes on every write. Null when nothing is stored. */
  revision: string | null;
}

export interface SaveResult {
  /** False when the stored data changed since `baseRevision` was read. */
  ok: boolean;
  /** The revision stored after the call. */
  revision: string | null;
}

export interface DeleteResult {
  revision: string | null;
  /** The revision the deletion was applied on top of. */
  previousRevision: string | null;
}

export async function getPresentations(
  userId: string,
): Promise<StoredPresentations> {
  const [data, storedRevision] = await redis.mget<[Presentation[] | null, string | null]>(
    redisKey(userId),
    revisionKey(userId),
  );

  if (data === null || data === undefined) return { presentations: null, revision: null };

  let revision = typeof storedRevision === "string" ? storedRevision : null;
  if (revision === null) {
    // Data saved before revisions existed: assign one now.
    const candidate = generateId();
    const created = await redis.set(revisionKey(userId), candidate, { nx: true });
    revision = created ? candidate : await redis.get<string>(revisionKey(userId));
  }

  if (!isValidPresentations(data)) {
    console.warn("Invalid presentations data in Redis, returning null");
    return { presentations: null, revision };
  }

  return { presentations: data, revision };
}

export async function savePresentations(
  userId: string,
  presentations: Presentation[],
  baseRevision: string | null,
  nextRevision: string = generateId(),
): Promise<SaveResult> {
  if (!isValidPresentations(presentations)) {
    throw new Error("Invalid presentations data");
  }
  const stored = await redis.eval<string[], string | null>(
    COMPARE_AND_SET_SCRIPT,
    [redisKey(userId), revisionKey(userId)],
    [baseRevision ?? "", JSON.stringify(presentations), nextRevision],
  );
  const revision = typeof stored === "string" ? stored : null;
  return { ok: revision === nextRevision, revision };
}

export async function deletePresentations(
  userId: string,
  ids: string[],
): Promise<DeleteResult> {
  const doomed = new Set(ids);

  for (let attempt = 0; attempt < MAX_DELETE_ATTEMPTS; attempt++) {
    const { presentations, revision } = await getPresentations(userId);
    if (!presentations) return { revision, previousRevision: revision };

    const remaining = presentations.filter((p) => !doomed.has(p.id));
    if (remaining.length === presentations.length) {
      return { revision, previousRevision: revision };
    }

    const result = await savePresentations(userId, remaining, revision);
    if (result.ok) return { revision: result.revision, previousRevision: revision };
    // Someone else wrote in between — re-read and try again.
  }

  throw new Error("Could not delete presentations: concurrent modification");
}
