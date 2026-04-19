import "server-only";
import { redis } from "@/lib/redis";
import { isValidPresentations } from "@/lib/validation";
import type { Presentation } from "@/types";

function redisKey(userId: string) {
  return `presentations:${userId}`;
}

export async function getPresentations(
  userId: string,
): Promise<Presentation[] | null> {
  const data = await redis.get<Presentation[]>(redisKey(userId));

  if (data === null) return null;
  if (!isValidPresentations(data)) {
    console.warn("Invalid presentations data in Redis, returning null");
    return null;
  }

  return data;
}

export async function savePresentations(
  userId: string,
  presentations: Presentation[],
): Promise<void> {
  if (!isValidPresentations(presentations)) {
    throw new Error("Invalid presentations data");
  }
  await redis.set(redisKey(userId), presentations);
}
