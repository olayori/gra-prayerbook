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

  await page.goto('app/#/weekly');
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
  await page.goto('app/#/weekly');
  // supabase-js retries GETs with backoff (~7s) before giving up.
  await expect(page.getByText(/Couldn’t load the weekly prayers/)).toBeVisible({ timeout: 15_000 });
});

test.describe('book reader', () => {
  test('Covenant Prayers: contents, marking prayed, saved progress', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto('app/#/book/covenant');
    await expect(page.getByRole('heading', { level: 1, name: 'Book of Covenant Prayers' })).toBeVisible();
    await expect(page.locator('.title-stats')).toHaveText(/^9 parts · \d+ sections · \d+ prayers$/);
    const total = (await page.locator('.title-stats').innerText()).match(/(\d+) prayers/)[1];
    await expect(page.locator('.hdr-count')).toHaveText(`0 / ${total}`);

    await page.locator('.toc-sec').first().click();
    const first = page.locator('#s-1-1-1');
    await first.getByRole('button', { name: 'Mark as prayed' }).click();
    await expect(first.getByRole('button', { name: /Prayed — tap to undo/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.hdr-count')).toHaveText(`1 / ${total}`);
    await expect(page.locator('#s-1-1 .section-progress')).toHaveText(/^1 of \d+ prayed$/);

    await first.getByRole('button', { name: 'Add to favorites' }).click();
    await expect(page.locator('.toast')).toHaveText('Added to favorites');

    await page.reload();
    await expect(page.locator('.hdr-count')).toHaveText(`1 / ${total}`);
    await expect(page.locator('#s-1-1-1').getByRole('button', { name: 'Remove from favorites' })).toBeVisible();

    await page.locator('#s-1-1').getByRole('button', { name: 'Mark all prayed' }).click();
    await expect(page.locator('#s-1-1').getByRole('button', { name: 'Clear section' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('settings: theme and scripture chips with the verse sheet', async ({ page }) => {
    await page.goto('app/#/book/covenant');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Sepia' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'sepia');
    await page.getByRole('button', { name: 'Hide' }).click();
    await page.getByRole('button', { name: 'Close' }).click();

    const chip = page.locator('.ref-chip').first();
    await chip.scrollIntoViewIfNeeded();
    const ref = (await chip.innerText()).trim();
    await chip.click();
    await expect(page.getByRole('dialog', { name: 'Scripture' })).toContainText(ref);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('JCFP: running numbers, prayer lists and this week’s prayers', async ({ page }) => {
    await page.goto('app/#/book/jcfp');
    await expect(page.locator('.title-stats')).toHaveText(/^3 prayer watches · \d+ prayers · 3 lists$/);
    await expect(page.locator('#part-1 .part-label')).toHaveText('Prayer Watch ONE');
    await expect(page.locator('#s-1-2 .prayer-n').first()).toHaveText('2');
    await expect(page.locator('#s-4-1 .section-kicker')).toContainText('Prayer List');
    await expect(page.locator('#s-4-1 .name-row').first()).toContainText('Alabama');
    await expect(page.locator('#weekly-kp .prayer')).toHaveCount(3);
    await expect(page.locator('#weekly-kp')).toContainText('Prayer 1 for this week.');
  });
});
