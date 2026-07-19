import { expect, test } from "@playwright/test";

// Editor registry flow over the mock stack (AUTH_MODE=disabled makes the dev
// principal an editor): inventory an existing project → see it badged in the
// list → archive it from the detail page. One test, so the created project
// can't get lost across workers.

test("inventory, list, and archive an existing project", async ({ page }) => {
  const projectName = `E2E inventoried project ${Date.now()}`;

  await test.step("inventory an existing project", async () => {
    await page.goto("/projects");
    await page.getByRole("link", { name: "Inventory existing project" }).click();

    await expect(
      page.getByRole("heading", { name: "Inventory an existing project" }),
    ).toBeVisible();
    await page.getByLabel(/Project name/).fill(projectName);
    await page
      .getByLabel(/What is this project/)
      .fill("Already-running automation captured for registry visibility.");
    await page.getByRole("button", { name: "Add to registry" }).click();

    await expect(page.getByRole("heading", { name: /added to the registry/i })).toBeVisible();
  });

  await test.step("registry list distinguishes inventoried projects", async () => {
    await page.goto("/projects");
    const row = page.getByRole("row", { name: new RegExp(projectName) });
    await expect(row).toBeVisible();
    await expect(row.getByText("Inventoried", { exact: true })).toBeVisible();
  });

  await test.step("archive the project from its detail page", async () => {
    await page.getByRole("link", { name: projectName }).click();
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible();

    // exact: true — otherwise the list page's "Show archived" chip matches
    // "Archive" (role-name matching is substring by default) during the
    // client-side route transition.
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.getByRole("button", { name: "Unarchive", exact: true })).toBeVisible();

    // Archived projects drop out of the default list.
    await page.goto("/projects");
    await expect(page.getByRole("link", { name: projectName })).toHaveCount(0);
  });
});
