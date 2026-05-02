import { test, expect } from "./fixtures";

test.describe("persistence (localStorage)", () => {
  test.beforeEach(async ({ server }) => {
    server.setPresentations([]);
  });

  test("a slide added before reload is restored after reload", async ({ page }) => {
    await page.goto("/");
    const slideList = page.getByRole("listbox", { name: /slides/i });
    const before = await slideList.getByRole("option").count();

    await page.getByRole("button", { name: /^Add content slide$/ }).click();
    await expect(slideList.getByRole("option")).toHaveCount(before + 1);

    // Title the new (active) slide so we can prove it's the same one after reload.
    const titleInput = page.getByPlaceholder(/^Slide title$/);
    await titleInput.fill("Persisted slide");
    await expect(
      page.getByRole("listbox", { name: /slides/i }).getByText("Persisted slide"),
    ).toBeVisible();

    await page.reload();

    await expect(slideList.getByRole("option")).toHaveCount(before + 1);
    await expect(
      page.getByRole("listbox", { name: /slides/i }).getByText("Persisted slide"),
    ).toBeVisible();
  });

  test("renaming the presentation persists across reload", async ({ page }) => {
    await page.goto("/");
    const nameInput = page.getByLabel("Presentation name");
    await nameInput.fill("E2E renamed deck");

    // The switcher trigger reflects the active presentation name.
    await expect(
      page.getByRole("button", { name: /e2e renamed deck/i }),
    ).toBeVisible();

    await page.reload();

    await expect(nameInput).toHaveValue("E2E renamed deck");
  });
});
