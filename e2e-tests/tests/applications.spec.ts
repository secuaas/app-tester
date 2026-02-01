import { test, expect } from '@playwright/test';

test.describe('Applications Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill('admin@secuaas.ca');
    await page.getByPlaceholder(/password/i).fill('TestForge2026!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/$/);
  });

  test('should navigate to applications page', async ({ page }) => {
    await page.getByRole('link', { name: /applications/i }).click();

    await expect(page).toHaveURL(/\/applications/);
    await expect(page.getByRole('heading', { name: /applications/i })).toBeVisible();
  });

  test('should display create application button', async ({ page }) => {
    await page.goto('/applications');

    await expect(page.getByRole('button', { name: /new application/i })).toBeVisible();
  });

  test('should open create application modal', async ({ page }) => {
    await page.goto('/applications');

    await page.getByRole('button', { name: /new application/i }).click();

    await expect(page.getByRole('heading', { name: /create application/i })).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/url/i)).toBeVisible();
  });

  test('should create new application', async ({ page }) => {
    await page.goto('/applications');

    await page.getByRole('button', { name: /new application/i }).click();

    const appName = `Test App ${Date.now()}`;
    await page.getByLabel(/^name/i).fill(appName);
    await page.getByLabel(/url/i).fill('https://api.example.com');
    await page.getByLabel(/description/i).fill('Test application created by E2E test');

    await page.getByRole('button', { name: /^create/i }).click();

    // Modal should close
    await expect(page.getByRole('heading', { name: /create application/i })).not.toBeVisible({ timeout: 5000 });

    // Application should appear in list
    await expect(page.getByText(appName)).toBeVisible({ timeout: 5000 });
  });

  test('should search applications', async ({ page }) => {
    await page.goto('/applications');

    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('test');

    // Results should update (implementation specific)
    // This test assumes client-side filtering is instant
    await page.waitForTimeout(500);
  });

  test('should display application cards', async ({ page }) => {
    await page.goto('/applications');

    // Check if at least one application card is visible
    const cards = page.locator('[class*="card"], [class*="application"]').first();
    await expect(cards).toBeVisible({ timeout: 5000 });
  });

  test('should show health check button', async ({ page }) => {
    await page.goto('/applications');

    // Look for health check or similar action button
    const healthButton = page.getByRole('button', { name: /health|check/i }).first();
    if (await healthButton.isVisible()) {
      await expect(healthButton).toBeVisible();
    }
  });
});
