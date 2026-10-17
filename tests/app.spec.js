import { expect, test } from '@playwright/test';

// The new app (app/, served from app/dist at /overcomers/app/). Supabase is answered with
// fixture data so the test is deterministic and never touches production.
const weeks = [
  {
    week_of: '2026-10-12', title: 'Weekly Kingdom Prayers', intro: '', closing: 'In Jesus Christ name we pray, AMEN!',
    prayers: [1, 2, 3].map((n) => ({ text: `Prayer ${n} for this week.`, ref: `Psalm ${n}:1` })),
  },
  {
    week_of: '2026-10-05', title: 'Mega Exploits 2026', intro: 'Pray daily.', closing: 'Amen.',
    prayers: [{ text: 'A prayer from last week.', ref: '' }],
  },
];

test.beforeEach(async ({ context }) => {
  await context.route(/supabase\.co\/rest\/v1\/weekly_prayers/, (route) => route.fulfill({ json: weeks }));
});

test('weekly prayers: current week, expand, past week', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('app/');
  await expect(page).toHaveURL(/#\/weekly$/);
  await expect(page.getByRole('heading', { name: /Week of/ })).toContainText('2026');
  await expect(page.getByText('This week', { exact: true })).toBeVisible();
  await expect(page.locator('.weekly-prayers li')).toHaveCount(2);

  await page.getByRole('button', { name: 'Show all 3 prayers' }).click();
  await expect(page.locator('.weekly-prayers li')).toHaveCount(3);
  await expect(page.getByText('In Jesus Christ name we pray, AMEN!')).toBeVisible();

  await page.getByRole('button', { name: 'Past weeks' }).click();
  await page.locator('.weekly-past a').nth(1).click();
  await expect(page).toHaveURL(/#\/weekly\/2026-10-05$/);
  await expect(page.getByText('Past week', { exact: true })).toBeVisible();
  await expect(page.getByText('Mega Exploits 2026')).toBeVisible();
  await expect(page.getByText('Pray daily.')).toBeVisible();

  expect(errors).toEqual([]);
});

test('weekly prayers: shows a message when offline', async ({ page, context }) => {
  await context.unroute(/supabase\.co\/rest\/v1\/weekly_prayers/);
  await context.route(/supabase\.co/, (route) => route.abort('internetdisconnected'));
  await page.goto('app/');
  // supabase-js retries GETs with backoff (~7s) before giving up.
  await expect(page.getByText(/Couldn’t load the weekly prayers/)).toBeVisible({ timeout: 15_000 });
});
