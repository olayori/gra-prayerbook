import { expect, test } from '@playwright/test';
import { signIn } from './helpers.js';

const tabs = (page) => page.getByRole('navigation', { name: 'Sections' }).getByRole('link');

test('a reader is told the account is not an editor', async ({ page }) => {
  await signIn(page, 'reader');
  await expect(page.getByRole('heading', { name: 'No admin access' })).toBeVisible();
  await expect(page.getByText('reader@test.local isn’t an editor or admin.', { exact: false })).toBeVisible();
  await expect(tabs(page)).toHaveCount(0);
});

test('an editor sees every tab except Users', async ({ page }) => {
  await signIn(page, 'editor');
  await expect(tabs(page)).toHaveText(['Content', 'Weekly', 'Translations', 'Insights', 'History']);
});

test('an admin also sees Users', async ({ page }) => {
  await signIn(page, 'admin');
  await expect(tabs(page)).toHaveText(['Content', 'Weekly', 'Users', 'Translations', 'Insights', 'History']);
});

test('the book picker lists the prayer books and remembers the choice', async ({ page }) => {
  await signIn(page, 'editor');
  const picker = page.getByLabel('Book');
  await expect(picker.locator('option')).toHaveText(['Book of Covenant Prayers', 'Jesus Chosen Fast and Prayer Prayer Manual']);
  await picker.selectOption('jcfp');
  await page.reload();
  await expect(page.getByLabel('Book')).toHaveValue('jcfp');
});

test('editors are sent from Users back to Content', async ({ page }) => {
  await signIn(page, 'editor', 'admin/users');
  await expect(page).toHaveURL(/#\/admin\/content$/);
});

