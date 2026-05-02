import { test as base, expect, type Route } from "@playwright/test";
import type { Presentation } from "../src/types";

/**
 * Shared E2E fixtures.
 *
 * - Stubs `/api/presentations` GET/PUT so tests don't need a live Redis.
 *   - GET → returns whatever the test pushed via `setServerPresentations`.
 *   - PUT → records the latest body and returns `{ ok: true }`.
 * - Provides helpers to inspect/override server state per test.
 *
 * The auth side is handled by `E2E_BYPASS=1` in `playwright.config.ts`
 * which makes `auth()` return a synthetic session in `src/auth.ts`.
 */

type ServerState = {
  presentations: Presentation[] | null;
  lastSavedPayload: unknown;
  /** Override GET to fail with this status. Set to null to clear. */
  forceGetStatus: number | null;
  /** Override PUT to fail with this status. Set to null to clear. */
  forcePutStatus: number | null;
};

type Fixtures = {
  server: {
    state: ServerState;
    setPresentations: (p: Presentation[] | null) => void;
    setForceGetStatus: (status: number | null) => void;
    setForcePutStatus: (status: number | null) => void;
  };
};

export const test = base.extend<Fixtures>({
  server: async ({ page }, use) => {
    const state: ServerState = {
      presentations: null,
      lastSavedPayload: null,
      forceGetStatus: null,
      forcePutStatus: null,
    };

    // Suppress the first-run "Learn" drawer so it doesn't intercept clicks in
    // the top bar. Tests that explicitly want to assert the drawer can clear
    // this flag from inside the test.
    await page.addInitScript(() => {
      try {
        localStorage.setItem("slidedude-learn-seen", "true");
      } catch {
        // ignore storage failures (private mode etc.)
      }
    });

    await page.route("**/api/presentations", async (route: Route) => {
      const method = route.request().method();
      if (method === "GET") {
        if (state.forceGetStatus !== null) {
          await route.fulfill({
            status: state.forceGetStatus,
            contentType: "application/json",
            body: JSON.stringify({ error: "forced" }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ presentations: state.presentations }),
        });
        return;
      }
      if (method === "PUT") {
        if (state.forcePutStatus !== null) {
          await route.fulfill({
            status: state.forcePutStatus,
            contentType: "application/json",
            body: JSON.stringify({ error: "forced" }),
          });
          return;
        }
        try {
          state.lastSavedPayload = JSON.parse(route.request().postData() ?? "{}");
        } catch {
          state.lastSavedPayload = null;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
        return;
      }
      await route.continue();
    });

    await use({
      state,
      setPresentations: (p) => {
        state.presentations = p;
      },
      setForceGetStatus: (status) => {
        state.forceGetStatus = status;
      },
      setForcePutStatus: (status) => {
        state.forcePutStatus = status;
      },
    });
  },
});

export { expect };
