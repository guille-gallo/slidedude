import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60 s"),
  prefix: "ratelimit:api",
});
