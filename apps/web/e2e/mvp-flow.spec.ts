import { expect, test } from "@playwright/test";

// End-to-end happy path over the mock stack (backend on :8000 with
// AUTH_MODE=disabled + AI_PROVIDER=mock and the seed content synced):
// browse a guide → copy a prompt → submit an intake → ask a question.

test.describe.configure({ mode: "serial" });

test("browse guides and open a playbook", async ({ page }) => {
  await page.goto("/guides");
  await expect(page.getByRole("heading", { name: "Guides" })).toBeVisible();

  const guide = page.getByRole("link", { name: /budget variance/i }).first();
  await expect(guide).toBeVisible();
  await guide.click();
  await expect(page.getByRole("heading", { name: /budget variance/i })).toBeVisible();
});

test("copy a prompt from the library", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/prompts");
  await expect(page.getByRole("heading", { name: "Prompt library" })).toBeVisible();

  const copy = page.getByRole("button", { name: "Copy prompt" }).first();
  await expect(copy).toBeVisible();
  await copy.click();
  await expect(page.getByRole("button", { name: /Copied/ }).first()).toBeVisible();
});

test("submit an AI use-case proposal", async ({ page }) => {
  await page.goto("/propose");
  await page.getByLabel(/Name your idea/).fill("E2E test proposal");
  await page
    .getByLabel(/What problem would it solve/)
    .fill("Automated end-to-end verification of the intake flow.");
  await page.getByRole("button", { name: "Submit proposal" }).click();
  await expect(
    page.getByRole("heading", { name: /proposal submitted/i }),
  ).toBeVisible();
});

test("ask a grounded question and get citations", async ({ page }) => {
  await page.goto("/ask");
  await page
    .getByLabel("Question")
    .fill("How do I analyze a budget variance with Copilot in Excel?");
  await page.getByRole("button", { name: "Ask" }).click();

  // Mock provider answers with a "[mock]" prefix; citations render as chips.
  await expect(page.getByText(/\[mock\]/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: /budget variance.*playbook/i })).toBeVisible();
});

test("insights reflects the activity above", async ({ page }) => {
  await page.goto("/insights");
  await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();
  await expect(page.getByText("Published guides")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Projects by status" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Most copied/ })).toBeVisible();
});
