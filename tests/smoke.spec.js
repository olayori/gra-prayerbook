import { expect, test } from '@playwright/test';

// Every page must unpack its design bundle and render without script errors.
// Supabase is blocked so tests never touch production data or usage stats;
// pages are expected to cope with being offline.
const PAGES = [
  { path: '', name: 'library home' },
  { path: 'covenant/', name: 'Book of Covenant Prayers' },
  { path: 'jcfp/', name: 'Jesus Chose Fast and Prayer' },
  { path: 'weekly/', name: 'Weekly Kingdom Prayers' },
  { path: 'read/', name: 'book reader' },
  { path: 'bible/', name: 'Bible' },
];

test.beforeEach(async ({ context }) => {
  await context.route(/supabase\.co/, (route) => route.abort('internetdisconnected'));
});

for (const { path, name } of PAGES) {
  test(`${name} renders`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(path);
    await expect(page.locator('#__bundler_loading')).toHaveCount(0, { timeout: 20_000 });
    await expect(page.locator('#__bundler_err')).toHaveCount(0);
    await expect(page.locator('body')).not.toBeEmpty();
    await expect.poll(async () => (await page.locator('body').innerText()).trim().length).toBeGreaterThan(20);
    expect(errors, `uncaught errors on ${path || '/'}`).toEqual([]);
  });
}
