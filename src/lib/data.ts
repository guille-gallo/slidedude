import "server-only";
import { Redis } from "@upstash/redis";
import type { Presentation } from "@/types";

function getRedis() {
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

function redisKey(userId: string) {
  return `presentations:${userId}`;
}

function isValidPresentation(p: unknown): p is Presentation {
  if (!p || typeof p !== "object") return false;
  const obj = p as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    Array.isArray(obj.slides) &&
    typeof obj.activeSlideIndex === "number"
  );
}

function isValidPresentations(data: unknown): data is Presentation[] {
  return Array.isArray(data) && data.every(isValidPresentation);
}

export async function getPresentations(
  userId: string,
): Promise<Presentation[] | null> {
  const redis = getRedis();
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
  const redis = getRedis();
  await redis.set(redisKey(userId), presentations);
}
