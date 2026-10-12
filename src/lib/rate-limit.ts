import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60 s"),
  prefix: "ratelimit:api",
});

export const accessRequestRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  prefix: "ratelimit:access-request",
});

// Caps total access-request emails, regardless of who is asking.
export const accessRequestGlobalRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 h"),
  prefix: "ratelimit:access-request-global",
});
