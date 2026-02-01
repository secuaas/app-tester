import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveTitle(/TestForge/);
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show demo credentials', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText(/demo credentials/i)).toBeVisible();
    await expect(page.getByText(/admin@secuaas.ca/)).toBeVisible();
    await expect(page.getByText(/TestForge2026!/)).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /sign in/i }).click();

    // HTML5 validation should prevent submission
    const emailInput = page.getByPlaceholder(/email/i);
    await expect(emailInput).toBeFocused();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder(/email/i).fill('invalid@example.com');
    await page.getByPlaceholder(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for error message
    await expect(page.getByText(/invalid|failed|error/i)).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder(/email/i).fill('admin@secuaas.ca');
    await page.getByPlaceholder(/password/i).fill('TestForge2026!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/$/, { timeout: 5000 });
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should store auth token in localStorage', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder(/email/i).fill('admin@secuaas.ca');
    await page.getByPlaceholder(/password/i).fill('TestForge2026!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/$/);

    // Check localStorage for token
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(accessToken).toBeTruthy();
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/applications');

    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('should logout successfully', async ({ page, context }) => {
    // Login first
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill('admin@secuaas.ca');
    await page.getByPlaceholder(/password/i).fill('TestForge2026!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/$/);

    // Logout
    await page.getByRole('button', { name: /logout|sign out/i }).click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Token should be removed
    const accessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(accessToken).toBeNull();
  });
});
