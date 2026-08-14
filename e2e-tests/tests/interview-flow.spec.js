const { test, expect } = require('@playwright/test');

test.describe('Core interview flow', () => {
  test('a new user can sign up and reach the dashboard', async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@test.com`;

    await page.goto('/signup');
    await page.fill('input[placeholder="Full Name"]', 'E2E Test User');
    await page.fill('input[placeholder="Email"]', uniqueEmail);
    await page.fill('input[placeholder="Password"]', 'TestPassword123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('an existing user can log in', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="Email"]', process.env.E2E_TEST_EMAIL || 'test@test.com');
    await page.fill('input[placeholder="Password"]', process.env.E2E_TEST_PASSWORD || 'TestPassword123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });

  test('starting a mock interview loads the first question', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="Email"]', process.env.E2E_TEST_EMAIL || 'test@test.com');
    await page.fill('input[placeholder="Password"]', process.env.E2E_TEST_PASSWORD || 'TestPassword123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

    await page.click('text=Start New Mock Interview');
    await expect(page.locator('text=Question 1 of')).toBeVisible({ timeout: 10000 });
  });
});