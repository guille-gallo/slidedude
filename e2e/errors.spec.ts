import { test, expect } from "./fixtures";

test.describe("error states", () => {
  test("custom 404 page renders for unknown routes", async ({ page, server }) => {
    server.setPresentations([]);
    await page.goto("/this-route-does-not-exist", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /404/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to editor/i })).toBeVisible();
  });

  test("server error on load does not break the editor (falls back to local data)", async ({ page, server }) => {
    server.setForceGetStatus(500);

    // No console errors should be unhandled. We only assert the editor shell
    // renders — the store catches GET failures and continues with whatever
    // localStorage already holds (the default fresh presentation in this case).
    await page.goto("/");

    await expect(page.locator("#main-editor")).toBeVisible();
    await expect(page.getByRole("complementary", { name: /slide list/i })).toBeVisible();
    // Default presentation always has at least one slide.
    await expect(
      page.getByRole("listbox", { name: /slides/i }).getByRole("option").first(),
    ).toBeVisible();
  });
});
