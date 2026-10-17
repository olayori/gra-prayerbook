import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { db, signIn } from './helpers.js';

test.beforeEach(() => db("delete from lib_draft where book = 'jcfp'; delete from book_editions where book_slug = 'jcfp' and version > 0;"));

async function openJcfp(page) {
  await signIn(page, 'editor');
  await page.getByLabel('Book', { exact: true }).selectOption('jcfp');
  await expect(page.getByLabel('Prayer 1.1.1', { exact: true })).toBeVisible();
}

test('the change log, restoring the original book and downloading a version', async ({ page }) => {
  await openJcfp(page);
  const original = await page.getByLabel('Prayer 1.1.1', { exact: true }).inputValue();
  await page.getByLabel('Prayer 1.1.1', { exact: true }).fill('Changed for history');
  await expect(page.getByText('Draft saved')).toBeVisible({ timeout: 5000 });

  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByText('1 change since version 0')).toBeVisible();
  await expect(page.getByText('Edited prayer 1.1.1')).toBeVisible();

  const original0 = page.locator('.adm-version').filter({ hasText: 'Original book' });
  await expect(original0).toContainText('The book as first loaded into the app');
  await expect(original0).toContainText('Live');

  const dl = page.waitForEvent('download');
  await original0.getByRole('button', { name: 'Download' }).click();
  const file = await (await dl).path();
  expect((await dl).suggestedFilename()).toBe('jcfp-v0.json');
  expect(JSON.parse(readFileSync(file, 'utf8'))[0].title).toBe('FIRST PRAYER WATCH');

  page.once('dialog', (d) => d.accept());
  await original0.getByRole('button', { name: 'Restore' }).click();
  await expect(page.getByText('Restored to the draft. Review it, then publish.')).toBeVisible();
  await expect(page.getByText('Choose a part or section from the outline.')).toBeVisible(); // as in the old console
  await page.locator('.adm-sec-row').first().click();
  await expect(page.getByLabel('Prayer 1.1.1', { exact: true })).toHaveValue(original);
  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByText('Restored the original book')).toBeVisible();
});
