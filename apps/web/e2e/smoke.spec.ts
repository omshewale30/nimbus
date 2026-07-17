import { expect, test } from "@playwright/test";

// Smoke test: the app loads and the browse-first home renders. Runs with auth
// disabled (see playwright.config.ts webServer env), so no Entra config is needed.
test("home loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AI enablement hub" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ask Nimbus" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Propose an AI use case" })).toBeVisible();
});

test("local dev auth-disabled banner is shown", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Auth is disabled/i)).toBeVisible();
});
