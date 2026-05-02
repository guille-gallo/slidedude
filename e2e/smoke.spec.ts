import { test, expect } from "./fixtures";

test.describe("smoke", () => {
  test("login page renders provider buttons", async ({ page }) => {
    // Even with E2E_BYPASS the /login route is publicly reachable; the proxy
    // explicitly allows it through. The page is a client component that lists
    // the OAuth providers.
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /slidedude/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in with google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in with github/i })).toBeVisible();
  });

  test("authenticated home page renders the editor shell", async ({ page, server }) => {
    server.setPresentations([]);
    await page.goto("/");
    // Top bar app name
    await expect(page.getByRole("heading", { name: /slidedude/i })).toBeVisible();
    // Sidebar (slide list region) and main editor are both present
    await expect(page.getByRole("complementary", { name: /slide list/i })).toBeVisible();
    await expect(page.locator("#main-editor")).toBeVisible();
  });
});
