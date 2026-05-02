import { test, expect } from "./fixtures";

test.describe("editor CRUD", () => {
  test.beforeEach(async ({ server }) => {
    server.setPresentations([]);
  });

  test("adds a code slide and makes it active", async ({ page }) => {
    await page.goto("/");

    // The store ships with one default slide; count it then add a second.
    const slideList = page.getByRole("listbox", { name: /slides/i });
    const initialCount = await slideList.getByRole("option").count();

    await page.getByRole("button", { name: /^Add code slide$/ }).click();

    await expect(slideList.getByRole("option")).toHaveCount(initialCount + 1);
    // Most recently added slide is selected.
    const selected = slideList.getByRole("option", { selected: true });
    await expect(selected).toHaveCount(1);
  });

  test("adds a content slide", async ({ page }) => {
    await page.goto("/");
    const slideList = page.getByRole("listbox", { name: /slides/i });
    const before = await slideList.getByRole("option").count();

    await page.getByRole("button", { name: /^Add content slide$/ }).click();

    await expect(slideList.getByRole("option")).toHaveCount(before + 1);
  });

  test("editing slide title is reflected in the slide list", async ({ page }) => {
    await page.goto("/");
    const titleInput = page.getByPlaceholder("Slide title (optional)");
    await expect(titleInput).toBeVisible();

    await titleInput.fill("My E2E slide");
    // The slide list shows the title as preview text on the active item.
    await expect(
      page.getByRole("listbox", { name: /slides/i }).getByText("My E2E slide"),
    ).toBeVisible();
  });

  test("duplicates a slide via the row action", async ({ page }) => {
    await page.goto("/");
    const slideList = page.getByRole("listbox", { name: /slides/i });
    const before = await slideList.getByRole("option").count();

    // Hover the first slide to reveal the duplicate button, then click it.
    const firstSlide = slideList.getByRole("option").first();
    await firstSlide.hover();
    await page.getByRole("button", { name: /^Duplicate slide 1$/ }).click();

    await expect(slideList.getByRole("option")).toHaveCount(before + 1);
  });

  test("cannot delete the last remaining slide", async ({ page }) => {
    await page.goto("/");
    const slideList = page.getByRole("listbox", { name: /slides/i });

    // Reduce to a single slide first if there is more than one.
    page.on("dialog", (d) => d.accept());
    let count = await slideList.getByRole("option").count();
    while (count > 1) {
      const last = slideList.getByRole("option").last();
      await last.hover();
      await page.getByRole("button", { name: new RegExp(`^Delete slide ${count}$`) }).click();
      count = await slideList.getByRole("option").count();
    }

    await expect(slideList.getByRole("option")).toHaveCount(1);

    // Attempt to delete the only remaining slide; the store guards against this.
    const last = slideList.getByRole("option").first();
    await last.hover();
    await page.getByRole("button", { name: /^Delete slide 1$/ }).click();

    await expect(slideList.getByRole("option")).toHaveCount(1);
  });
});
