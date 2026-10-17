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

// The old guest unlock as the live site stores it. The app ignores it now; the live
// page still honours it until its redesign.
const UNLOCKED = 'e6a0edc6786aea7bad85cc9fec671bfa84763bd161c450a579df4b1087b5d270';

test.beforeEach(async ({ context }) => {
  // Every Supabase call fails (no auth, edition checks or usage counts reach production)
  // except the weekly prayers, which get fixture data. Later routes take precedence.
  await context.route(/supabase\.co/, (route) => route.abort('internetdisconnected'));
  await context.route(/supabase\.co\/rest\/v1\/weekly_prayers/, (route) => route.fulfill({ json: weeks }));
});

const unlockLiveSite = (page) => page.addInitScript((h) => localStorage.setItem('gra-covenant-unlocked', h), UNLOCKED);

// A signed-in member: a stored session (not expired, so no network check) plus the
// remembered membership, exactly as the app and live site keep them.
const MEMBER = '00000000-0000-0000-0000-000000000001';
const asMember = (page) =>
  page.addInitScript((id) => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem(
      'gra-covenant-auth',
      JSON.stringify({ access_token: 'test', refresh_token: 'test', token_type: 'bearer', expires_in: 3600, expires_at: now + 3600,
        user: { id, aud: 'authenticated', role: 'authenticated', email: 'member@test', app_metadata: {}, user_metadata: {}, created_at: '2026-10-01T00:00:00Z' } }),
    );
    localStorage.setItem('gra-covenant-member', JSON.stringify(id));
  }, MEMBER);

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

test.describe('access', () => {
  test('JCFP opens without signing in', async ({ page }) => {
    await page.goto('app/#/book/jcfp');
    await expect(page.getByRole('heading', { level: 1, name: /Jesus Chosen Fast and Prayer/ })).toBeVisible();
    await expect(page.locator('.lock')).toHaveCount(0);
  });

  test('Covenant asks a signed-out reader to sign in, with no access-code option', async ({ page }) => {
    await page.goto('app/#/book/covenant');
    await expect(page.locator('.lock')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Create account' }).first().click();
    await expect(page.getByLabel('Registration code')).toBeVisible();
    await expect(page.getByText('Continue with access code')).toHaveCount(0);
  });

  test('an old guest unlock no longer opens Covenant but keeps its progress', async ({ page }) => {
    await page.addInitScript((h) => {
      // A real live-site device: current layout, guest-unlocked, with progress.
      localStorage.setItem('gra-covenant-layout', '3');
      localStorage.setItem('gra-covenant-unlocked', h);
      localStorage.setItem('gra-covenant-prayed', '{"s-1-1-1":1}');
    }, UNLOCKED);
    await page.goto('app/#/book/covenant');
    await expect(page.locator('.lock')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('gra-covenant-prayed'))).toBe('{"s-1-1-1":1}');
  });

  test('a free-book reader can create an account without a registration code', async ({ page, context }) => {
    await context.route(/supabase\.co\/auth\/v1\/signup/, (route) => route.fulfill({ json: { id: 'new-user', email: 'reader@test', identities: [] } }));
    await page.goto('app/#/book/jcfp');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Sign in or create account' }).click();
    await page.getByRole('button', { name: 'Create account' }).first().click();
    await expect(page.getByLabel(/Registration code/)).toBeVisible();
    await page.getByLabel('Email').fill('reader@test');
    await page.getByLabel('Password').fill('a-long-password');
    await page.locator('.lock-form').getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('status')).toContainText('We sent a confirmation link to reader@test');
  });

  test('Covenant sign-up still needs the registration code', async ({ page }) => {
    await page.goto('app/#/book/covenant');
    await page.getByRole('button', { name: 'Create account' }).first().click();
    await page.getByLabel('Email').fill('reader@test');
    await page.getByLabel('Password').fill('a-long-password');
    await page.locator('.lock-form').getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('alert')).toHaveText('Enter the registration code from GRA.');
  });

  test('signed-out JCFP reader can open sign-in from Settings and dismiss it', async ({ page }) => {
    await page.goto('app/#/book/jcfp');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Sign in or create account' }).click();
    await expect(page.locator('.lock')).toBeVisible();
    await page.getByRole('button', { name: 'Not now' }).click();
    await expect(page.locator('.lock')).toHaveCount(0);
  });
});

test.describe('book reader', () => {
  test.describe('as a member', () => {
    test.beforeEach(({ page }) => asMember(page));

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
  test.beforeEach(({ page }) => asMember(page));

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
  test.beforeEach(async ({ page }) => {
    await asMember(page);
    await unlockLiveSite(page);
  });

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
