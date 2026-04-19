/**
 * Validate that required environment variables are set.
 * Import this in server entry points to fail fast on misconfiguration.
 */

const required = [
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "AUTH_SECRET",
] as const;

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`
  );
}
