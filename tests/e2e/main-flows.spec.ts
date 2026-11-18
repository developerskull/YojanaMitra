import { expect, test } from '@playwright/test';

test.describe('YojanaMitra Main Flows', () => {
  test('landing page displays trust banner, language switch works, and Marathi farmer chat returns cited eligible scheme cards', async ({
    page,
  }) => {
    await page.goto('/');

    // Trust banner visible
    await expect(page.getByRole('note', { name: /trust notice/i })).toBeVisible();

    // Switch language to Marathi
    await page.getByRole('button', { name: 'मराठी' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('योजना');

    // Submit the Nashik Marathi farmer query via text input
    const input = page.locator('#yojana-query-input');
    await input.fill('मी नाशिकचा ४५ वर्षांचा शेतकरी आहे, माझ्याकडे २ एकर जमीन आहे');
    await page.getByRole('button', { name: 'योजना शोधा' }).click();

    // Wait for cited scheme cards to render
    await expect(page.getByText(/पीएम-किसान|नमो शेतकरी/).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('[S1]').first()).toBeVisible();

    // Save the first scheme and verify it appears on /saved
    await page.getByRole('button', { name: 'जतन करा' }).first().click();
    await page.goto('/saved');
    await expect(page.getByText(/पीएम-किसान|नमो शेतकरी|शेततळे/).first()).toBeVisible();

    // Check aggregated documents checklist tab
    await page.getByRole('tab', { name: /कागदपत्रे/ }).click();
    await expect(page.getByText('आधार कार्ड').first()).toBeVisible();
  });

  test('guided eligibility wizard steps through questions and shows eligible schemes', async ({
    page,
  }) => {
    await page.goto('/wizard');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Answer State -> Maharashtra
    await page.getByRole('button', { name: 'Maharashtra' }).click();
    // Answer Age -> 72
    await page.locator('input[type="number"]').fill('72');
    await page.getByRole('button', { name: /Next/i }).click();
    // Click "See My Eligible Schemes"
    await page.getByRole('button', { name: /See My Eligible Schemes/i }).click();

    // Ayushman Vaya Vandana (70+) should be eligible
    await expect(page.getByText(/Ayushman Vaya Vandana/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('scheme explorer filters instantly across schemes', async ({ page }) => {
    await page.goto('/explorer');
    const search = page.locator('input[type="search"]');
    await search.fill('Ladki Bahin');
    await expect(page.getByText(/Ladki Bahin/i).first()).toBeVisible();
  });
});
