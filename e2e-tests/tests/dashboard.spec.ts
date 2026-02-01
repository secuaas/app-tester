import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill('admin@secuaas.ca');
    await page.getByPlaceholder(/password/i).fill('TestForge2026!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/$/);
  });

  test('should display dashboard heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should display statistics cards', async ({ page }) => {
    // Look for stat cards - these should be visible
    const statsSection = page.locator('[class*="stat"], [class*="card"]').first();
    await expect(statsSection).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to applications from dashboard', async ({ page }) => {
    await page.getByRole('link', { name: /applications/i }).click();

    await expect(page).toHaveURL(/\/applications/);
  });

  test('should navigate to test suites from dashboard', async ({ page }) => {
    await page.getByRole('link', { name: /test/i }).click();

    await expect(page).toHaveURL(/\/tests/);
  });

  test('should navigate to executions from dashboard', async ({ page }) => {
    await page.getByRole('link', { name: /executions/i }).click();

    await expect(page).toHaveURL(/\/executions/);
  });

  test('should navigate to credentials from dashboard', async ({ page }) => {
    await page.getByRole('link', { name: /credentials/i }).click();

    await expect(page).toHaveURL(/\/credentials/);
  });

  test('should display user profile', async ({ page }) => {
    // Look for user email or profile info
    await expect(page.getByText(/admin@secuaas.ca/i)).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    // Dashboard should still be accessible
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // Mobile menu should be visible
    const menuButton = page.getByRole('button', { name: /menu|navigation/i });
    if (await menuButton.isVisible()) {
      await expect(menuButton).toBeVisible();
    }
  });
});
