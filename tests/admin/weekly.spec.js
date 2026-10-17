import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { db, signIn } from './helpers.js';

const sheet = readFileSync(new URL('../../app/src/features/admin/weekly/fixtures/oct-12.txt', import.meta.url), 'utf8');

test.beforeEach(() => db("delete from weekly_prayers where updated_by_email like '%@test.local'"));

test('paste a week, split it, save as a draft, then delete it', async ({ page }) => {
  await signIn(page, 'editor', 'admin/weekly');
  await page.getByRole('button', { name: 'New week' }).click();
  await page.getByLabel('Paste the whole week').fill(sheet);
  await page.getByRole('button', { name: 'Split into prayers' }).click();
  await expect(page.getByText(/^7 prayers found · week of .*Check them below\.$/)).toBeVisible();
  await expect(page.getByLabel('Week of (Monday)')).toHaveValue('2026-10-12');

  // Review focus 4: nothing numbered → a note, and the prayers stay as they were.
  await page.getByLabel('Paste the whole week').fill('hello');
  await page.getByRole('button', { name: 'Split into prayers' }).click();
  await expect(page.getByText('No numbered prayers found. Each prayer should start with 1. 2. 3. …')).toBeVisible();
  await expect(page.getByText('7 prayers', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Keep as draft' }).click();
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Saved as draft')).toBeVisible();
  expect(db("select count(*) from weekly_prayers where week_of = '2026-10-12' and publish_at is null and updated_by_email = 'editor@test.local'")).toBe('1');

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete week' }).click();
  await expect(page.getByText('Week deleted')).toBeVisible();
  expect(db("select count(*) from weekly_prayers where updated_by_email = 'editor@test.local'")).toBe('0');
});

test('saving needs at least one prayer', async ({ page }) => {
  await signIn(page, 'editor', 'admin/weekly');
  await page.getByRole('button', { name: 'New week' }).click();
  await page.getByRole('button', { name: 'Schedule' }).first().click();
  await page.locator('.adm-wk-save').click();
  await expect(page.getByRole('alert')).toHaveText('Add at least one prayer.');
});
