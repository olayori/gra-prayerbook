import { expect, test } from '@playwright/test';
import { db, signIn } from './helpers.js';

const clear = () => db("delete from public.usage_daily where ref like 'e2e-%' or kind = 'search';");
test.beforeEach(clear);
test.afterEach(clear);

test('the Prayers checked tile counts the period’s usage', async ({ page }) => {
  db(`insert into public.usage_daily (day, kind, ref, n) values
        (current_date, 'pray', 'e2e-a', 7), (current_date - 1, 'pray', 'e2e-b', 5), (current_date - 30, 'pray', 'e2e-c', 100),
        (current_date, 'search', 'e2e-healing', 3)
      on conflict (day, kind, ref) do update set n = excluded.n;`);
  const before = Number(db("select coalesce(sum(n), 0) from public.usage_daily where kind = 'pray' and day > current_date - 7;"));

  await signIn(page, 'admin', 'admin/insights');
  await page.getByRole('button', { name: '7 days' }).click();
  const tile = page.locator('.adm-ins-stats > div').filter({ hasText: 'Prayers checked' });
  await expect(tile).toContainText(before.toLocaleString('en-US'));
  await expect(page.getByText('e2e-healing · 3')).toBeVisible();
});

test('other books say usage is only counted for Covenant', async ({ page }) => {
  await signIn(page, 'admin', 'admin/insights');
  await page.getByLabel('Book', { exact: true }).selectOption('jcfp');
  await expect(page.getByText('Usage is only counted for the Book of Covenant Prayers.')).toBeVisible();
});
