import { test, expect } from '@playwright/test';

// Ensure landing page redirects to home and navigation works

test('redirects to home and navigates to upload', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL('**/home');
  await expect(page.locator('text=Loading...')).toBeVisible();
  await page.goto('/upload');
  await expect(page.locator('input[type="file"]')).toBeVisible();
});
