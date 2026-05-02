import { test, expect } from "./fixtures";

const TWO_SLIDE_DECK = {
  state: {
    presentations: [
      {
        id: "e2e-deck",
        name: "Present deck",
        slides: [
          {
            id: "e2e-s1",
            type: "code",
            title: "First slide",
            code: "console.log(1);",
            language: "javascript",
          },
          {
            id: "e2e-s2",
            type: "code",
            title: "Second slide",
            code: "console.log(2);",
            language: "javascript",
          },
        ],
        activeSlideIndex: 0,
      },
    ],
    activePresentationId: "e2e-deck",
  },
  version: 0,
};

test.describe("present mode", () => {
  test.beforeEach(async ({ server, page }) => {
    server.setPresentations([]);
    // Seed Zustand persist storage so /present has 2 slides to navigate.
    await page.addInitScript((seed) => {
      try {
        localStorage.setItem("slidedude-presentations", JSON.stringify(seed));
      } catch {
        // ignore
      }
    }, TWO_SLIDE_DECK);
  });

  test("renders the first slide and slide counter", async ({ page }) => {
    await page.goto("/present");
    await expect(page.getByText("1 / 2")).toBeVisible();
    await expect(page.getByRole("heading", { name: "First slide" })).toBeVisible();
  });

  test("ArrowRight advances to the next slide", async ({ page }) => {
    await page.goto("/present");
    await expect(page.getByText("1 / 2")).toBeVisible();

    await page.keyboard.press("ArrowRight");

    await expect(page.getByText("2 / 2")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Second slide" })).toBeVisible();
  });
});
