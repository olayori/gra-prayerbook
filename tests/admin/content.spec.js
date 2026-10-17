import { expect, test } from '@playwright/test';
import { ACCOUNTS, db, signIn } from './helpers.js';

const resetJcfp = () => db("delete from lib_draft where book = 'jcfp'; delete from book_editions where book_slug = 'jcfp' and version > 0;");
const draftText = () => db("select data->0->'sections'->0->'prayers'->0->>'text' from lib_draft where book = 'jcfp'");

async function openJcfp(page, who = 'editor') {
  await signIn(page, who);
  await page.getByLabel('Book', { exact: true }).selectOption('jcfp');
  await expect(page.getByLabel('Prayer 1.1.1', { exact: true })).toBeVisible();
}

test.beforeEach(() => resetJcfp());

test('editing saves the draft, and undo puts the text back', async ({ page }) => {
  await openJcfp(page);
  const prayer = page.getByLabel('Prayer 1.1.1', { exact: true });
  const original = await prayer.inputValue();
  await prayer.fill('Prayers for America and her leaders');
  await expect(page.getByText('Draft saved')).toBeVisible({ timeout: 5000 });
  expect(draftText()).toBe('Prayers for America and her leaders');

  await page.locator('body').click(); // leave the textarea so the shortcut is not typing
  await page.keyboard.press('Control+z');
  await expect(prayer).toHaveValue(original);
});

test('problems block publishing and jump to the empty prayer; then it publishes', async ({ page }) => {
  await openJcfp(page);
  await page.getByRole('button', { name: '+ Add prayer' }).click();
  await page.getByRole('button', { name: /^Publish/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Publish changes' });
  await expect(dialog.getByText('Fix before publishing')).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Publish version 1/ })).toBeDisabled();
  await dialog.getByRole('button', { name: /Prayer 1\.1\.\d+ is empty/ }).click();
  await expect(page.locator('textarea:focus')).toHaveAttribute('aria-label', /Prayer 1\.1\.\d+/);
  await page.locator('textarea:focus').fill('A new prayer for the nations.');

  await page.getByRole('button', { name: /^Publish/ }).click();
  await dialog.getByLabel('Note for the history (optional)').fill('test');
  await dialog.getByRole('button', { name: 'Publish version 1' }).click();
  await expect(page.getByText('Version 1 published')).toBeVisible();
  expect(db("select max(version) from book_editions where book_slug = 'jcfp'")).toBe('1');
  expect(db("select note from book_editions where book_slug = 'jcfp' and version = 1")).toBe('test');
});

test('a second editor’s newer save is never overwritten', async ({ page, browser }) => {
  await openJcfp(page, 'editor');
  const other = await browser.newPage({ baseURL: 'http://localhost:4310/' });
  await openJcfp(other, 'admin');
  await other.getByLabel('Prayer 1.1.1', { exact: true }).fill('Changed by the admin');
  await expect(other.getByText('Draft saved')).toBeVisible({ timeout: 5000 });

  await page.getByLabel('Prayer 1.1.1', { exact: true }).fill('Changed by the editor');
  await expect(page.getByRole('alert').filter({ hasText: 'Someone else changed the draft while you were editing.' })).toBeVisible({ timeout: 5000 });
  expect(draftText()).toBe('Changed by the admin');
  await page.getByRole('button', { name: 'Reload draft' }).click();
  await expect(page.getByLabel('Prayer 1.1.1', { exact: true })).toHaveValue('Changed by the admin');
  await other.close();
});

test('leaving with unsaved changes asks first', async ({ page }) => {
  await openJcfp(page);
  await page.getByLabel('Prayer 1.1.1', { exact: true }).fill('Unsaved words');
  const prevented = await page.evaluate(() => {
    const e = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(e);
    return e.defaultPrevented;
  });
  expect(prevented).toBe(true);
});

test('the outline finds prayers and sections', async ({ page }) => {
  await openJcfp(page);
  await page.getByLabel('Find').fill('Israel');
  await expect(page.getByText(/^\d+ match(es)?$/)).toBeVisible();
  await page.getByLabel('Find').fill('zzzzzz');
  await expect(page.getByText('No matches')).toBeVisible();
});

export { ACCOUNTS };
