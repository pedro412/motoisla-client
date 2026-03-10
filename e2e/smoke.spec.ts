import { expect, test } from "@playwright/test";

test("login page renders auth layout", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "MotoIsla Client" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
});

test("public catalog is reachable without auth", async ({ page }) => {
  await page.goto("/catalog");

  await expect(page.getByRole("heading", { name: /Cat[aá]logo P[uú]blico/i })).toBeVisible();
});

test("private route redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/pos");

  await expect(page).toHaveURL(/\/login$/);
});
