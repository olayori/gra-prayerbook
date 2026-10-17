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

// Guest unlock, as the live site stores it (the access code's SHA-256).
const UNLOCKED = 'e6a0edc6786aea7bad85cc9fec671bfa84763bd161c450a579df4b1087b5d270';

test.beforeEach(async ({ context }) => {
  // Every Supabase call fails (no auth, edition checks or usage counts reach production)
  // except the weekly prayers, which get fixture data. Later routes take precedence.
  await context.route(/supabase\.co/, (route) => route.abort('internetdisconnected'));
  await context.route(/supabase\.co\/rest\/v1\/weekly_prayers/, (route) => route.fulfill({ json: weeks }));
});

const unlock = (page) => page.addInitScript((h) => localStorage.setItem('gra-covenant-unlocked', h), UNLOCKED);

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
  await page.goto('app/#/weekly');
  // supabase-js retries GETs with backoff (~7s) before giving up.
  await expect(page.getByText(/Couldn’t load the weekly prayers/)).toBeVisible({ timeout: 15_000 });
});

test.describe('book reader', () => {
  test('is locked until signed in or unlocked with the access code', async ({ page }) => {
    await page.goto('app/#/book/covenant');
    await expect(page.getByRole('heading', { level: 1, name: 'Book of Covenant Prayers' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Create account' }).first().click();
    await expect(page.getByLabel('Registration code')).toBeVisible();
    await page.getByRole('button', { name: 'Continue with access code' }).click();
    await expect(page.getByRole('heading', { name: 'Use an access code' })).toBeVisible();
    await page.getByLabel('Access code').fill('not the code');
    await page.getByRole('button', { name: 'Open the book' }).click();
    await expect(page.getByRole('alert')).toHaveText('That access code isn’t right.');
    await expect(page.locator('.reader')).toHaveCount(0);
  });

  test.describe('unlocked', () => {
    test.beforeEach(({ page }) => unlock(page));

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
});

// Speech that "finishes" each chunk after 30ms, so read-aloud can be tested headless.
const fakeSpeech = (page) =>
  page.addInitScript(() => {
    const spoken = (window.__spoken = []);
    let timer;
    const fake = {
      getVoices: () => [],
      speak(u) {
        spoken.push(u.text);
        timer = setTimeout(() => u.onend && u.onend(), 30);
      },
      cancel() {
        clearTimeout(timer);
      },
    };
    // speechSynthesis is a read-only accessor, so it has to be redefined, not assigned.
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: function (text) {
        this.text = text;
      },
      configurable: true,
    });
  });

test.describe('Focused Mode and Listen', () => {
  test.beforeEach(({ page }) => unlock(page));

  test('Focused Mode: one prayer at a time, Amen · Next marks it prayed, timer, close', async ({ page }) => {
    await page.goto('app/#/book/covenant');
    await page.locator('.toc-sec').first().click();
    await page.locator('#s-1-1').getByRole('button', { name: 'Focused Mode' }).click();
    const focus = page.getByRole('dialog', { name: 'Focused Mode' });
    await expect(focus.locator('.focus-kicker')).toHaveText(/^1\.1 · Prayer 1 of \d+$/);

    await focus.getByRole('button', { name: 'Amen · Next' }).click();
    await expect(focus.locator('.focus-kicker')).toHaveText(/^1\.1 · Prayer 2 of \d+$/);
    await expect(focus.locator('.focus-count')).toContainText('1');
    await page.keyboard.press('ArrowLeft');
    await expect(focus.locator('.focus-kicker')).toHaveText(/^1\.1 · Prayer 1 of \d+$/);

    await focus.getByRole('button', { name: 'Prayer timer' }).click();
    await focus.getByRole('button', { name: '30s', exact: true }).click();
    await expect(focus.getByRole('button', { name: 'Prayer timer' })).toContainText('0:30');
    await page.keyboard.press('Escape');
    await expect(focus).toHaveCount(0);
    await expect(page.locator('#s-1-1-1').getByRole('button', { name: /Prayed — tap to undo/ })).toBeVisible();
  });

  test('tapping a prayer opens it in Focused Mode', async ({ page }) => {
    await page.goto('app/#/book/covenant');
    await page.locator('.toc-sec').first().click();
    await page.locator('#s-1-1-3 .prayer-text').click();
    await expect(page.getByRole('dialog', { name: 'Focused Mode' }).locator('.focus-kicker')).toHaveText(/^1\.1 · Prayer 3 of \d+$/);
  });

  test('Listen reads the section aloud, checks off prayers and shows the player', async ({ page }) => {
    await fakeSpeech(page);
    await page.goto('app/#/book/covenant');
    await page.locator('.toc-sec').first().click();
    await page.locator('#s-1-1').getByRole('button', { name: 'Listen' }).click();

    // Foundation first, then prayers; each prayer is checked off once read.
    await expect(page.locator('#s-1-1-2').getByRole('button', { name: /Prayed — tap to undo/ })).toBeVisible();
    const spoken = await page.evaluate(() => window.__spoken);
    expect(spoken[0]).toMatch(/Scripture foundation/);
    expect(spoken.some((t) => t.startsWith('Prayer 1.'))).toBe(true);

    const mini = page.locator('.np-mini');
    await mini.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(mini.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await mini.getByRole('button', { name: 'Open player' }).click();
    const sheet = page.getByRole('dialog', { name: 'Now playing' });
    await expect(sheet).toContainText('Book of Covenant Prayers');
    await sheet.getByRole('button', { name: /× Speed/ }).click();
    await expect(sheet.getByRole('button', { name: /× Speed/ })).toContainText('1.2× Speed');
    await sheet.getByRole('button', { name: 'Stop and close' }).click();
    await expect(page.locator('.np-mini')).toHaveCount(0);
  });
});

// The app and the live site share progress (same storage keys), so nobody loses
// anything when the app replaces the site.
test.describe('shared progress with the live site', () => {
  test.beforeEach(({ page }) => unlock(page));

  test('a prayer marked in the app shows as prayed on the live Covenant page, and back', async ({ page }) => {
    await page.goto('app/#/book/covenant');
    await page.locator('.toc-sec').first().click();
    await page.locator('#s-1-1-1').getByRole('button', { name: 'Mark as prayed' }).click();
    await expect(page.locator('.hdr-count')).toHaveText(/^1 \/ \d+$/);

    // The live site shows one page at a time; open it at section 1.1.
    await page.goto('covenant/#s-1-1');
    await expect(page.getByRole('button', { name: /^Prayer history\. 1 of \d+ prayers checked$/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#s-1-1-1').getByRole('button', { name: /Prayed — tap to undo/ })).toBeVisible();
    await page.locator('#s-1-1-2').getByRole('button', { name: 'Mark as prayed' }).click();
    await expect(page.getByRole('button', { name: /^Prayer history\. 2 of \d+ prayers checked$/ })).toBeVisible();

    await page.goto('app/#/book/covenant');
    await expect(page.locator('.hdr-count')).toHaveText(/^2 \/ \d+$/);
    await expect(page.locator('#s-1-1-2').getByRole('button', { name: /Prayed — tap to undo/ })).toBeVisible();
  });
});
