import { test, expect } from "@playwright/test";

test("landing page links into the demo workspace", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Support ops, made inspectable.")).toBeVisible();
  await page.getByRole("link", { name: "Open demo workspace" }).click();
  await expect(page.getByRole("heading", { name: "Support chat" })).toBeVisible();
});
