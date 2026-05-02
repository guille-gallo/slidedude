import path from "node:path";
import fs from "node:fs/promises";
import { test, expect } from "./fixtures";

test.describe("export / import", () => {
  test.beforeEach(async ({ server, page }) => {
    server.setPresentations([]);
    // Capture every blob handed to URL.createObjectURL so we can read what
    // the Export button produced without relying on the browser's download UI
    // (the app revokes the blob URL immediately after clicking the anchor,
    // which races Playwright's download capture in headless mode).
    await page.addInitScript(() => {
      const orig = URL.createObjectURL.bind(URL);
      const captured: Blob[] = [];
      // @ts-expect-error attach a debug handle for the test
      window.__exportedBlobs = captured;
      URL.createObjectURL = (obj) => {
        if (obj instanceof Blob) captured.push(obj);
        return orig(obj);
      };
    });
  });

  test("Export button produces a valid presentation JSON blob", async ({ page }) => {
    await page.goto("/");

    await page.getByLabel("Presentation name").fill("Export deck");

    await page.getByRole("button", { name: /^Export$/ }).click();

    const text = await page.evaluate(async () => {
      // @ts-expect-error see beforeEach
      const blobs: Blob[] = window.__exportedBlobs ?? [];
      const blob = blobs.at(-1);
      return blob ? await blob.text() : "";
    });

    expect(text).not.toBe("");
    const json = JSON.parse(text);
    expect(json.name).toBe("Export deck");
    expect(Array.isArray(json.slides)).toBe(true);
    expect(json.slides.length).toBeGreaterThan(0);
  });

  test("imports a known-good presentation file", async ({ page }, testInfo) => {
    await page.goto("/");

    await fs.mkdir(testInfo.outputDir, { recursive: true });
    const fixturePath = path.join(testInfo.outputDir, "imported.slidedude.json");
    const fixture = {
      version: 1,
      name: "Imported deck",
      slides: [
        {
          id: "any-id-will-be-regenerated",
          type: "code",
          title: "Hello",
          code: "console.log('hi');",
          language: "javascript",
        },
      ],
      activeSlideIndex: 0,
    };
    await fs.writeFile(fixturePath, JSON.stringify(fixture));

    await page.getByLabel("Import presentation file").setInputFiles(fixturePath);

    // After import the switcher trigger reflects the imported deck name.
    await expect(
      page.getByRole("button", { name: /imported deck/i }),
    ).toBeVisible();
  });
});
