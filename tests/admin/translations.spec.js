import { expect, test } from '@playwright/test';
import { db, signIn } from './helpers.js';

const clear = () => db("delete from public.translations where src_hash like 'e2e-%';");
test.beforeEach(clear);
test.afterEach(clear);

test('search, edit and save a translation', async ({ page }) => {
  db("insert into public.translations (src_hash, lang, src, out) values ('e2e-1', 'fr', 'Father, let your fire fall', 'Père, que ton feu tombe');");
  await signIn(page, 'editor', 'admin/translations');
  await page.getByLabel('Search translations').fill('fire fall');
  const searched = page.waitForResponse((r) => r.url().includes('/translations?') && r.url().includes('ilike'));
  await page.getByLabel('Search translations').press('Enter');
  await searched;

  const row = page.locator('.adm-tr-row').filter({ hasText: 'Father, let your fire fall' });
  await expect(row).toContainText('Français · DeepL');
  await row.getByRole('textbox').fill('Père, fais tomber ton feu');
  await row.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Translation saved')).toBeVisible();
  await expect(row).toContainText('Français · edited');
  expect(db("select edited || '|' || out from public.translations where src_hash = 'e2e-1';")).toBe('true|Père, fais tomber ton feu');

  await page.getByLabel('Search translations').fill('nothing like this e2e');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByText('No translations match that search.')).toBeVisible();
});
