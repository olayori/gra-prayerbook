import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ACCOUNTS, db, signIn } from './helpers.js';

const roleOf = (email) => db(`select coalesce((select a.role from public.admins a join auth.users u on u.id = a.user_id where u.email = '${email}'), 'reader');`).trim();
const row = (page, email) => page.locator('.adm-users tbody tr').filter({ hasText: email });

test.afterEach(() => db(`delete from public.admins where user_id = (select id from auth.users where email = '${ACCOUNTS.reader.email}');`));

test('listing users and changing access', async ({ page }) => {
  await signIn(page, 'admin', 'admin/users');
  await expect(page.getByText(/\d+ accounts · \d+ activated · \d+ active this week/)).toBeVisible();
  await expect(row(page, ACCOUNTS.reader.email)).toContainText('Not activated');

  await row(page, ACCOUNTS.reader.email).click();
  const panel = page.getByRole('dialog');
  await expect(panel.getByText('Last 26 weeks')).toBeVisible();
  await panel.getByRole('button', { name: 'Editor' }).click();
  await expect(page.getByText('Access updated')).toBeVisible();
  expect(roleOf(ACCOUNTS.reader.email)).toBe('editor');
  await expect(row(page, ACCOUNTS.reader.email)).toContainText('Editor');

  await panel.getByRole('button', { name: 'Reader' }).click();
  await expect(panel.getByRole('button', { name: 'Reader' })).toHaveAttribute('aria-pressed', 'true');
  expect(roleOf(ACCOUNTS.reader.email)).toBe('reader');
});

test('you can’t remove your own admin access or delete yourself', async ({ page }) => {
  await signIn(page, 'admin', 'admin/users');
  await row(page, ACCOUNTS.admin.email).click();
  const panel = page.getByRole('dialog');
  await panel.getByRole('button', { name: 'Reader' }).click();
  await expect(page.getByText('You can’t remove your own admin access')).toBeVisible();
  expect(roleOf(ACCOUNTS.admin.email)).toBe('admin');
  await expect(panel.getByRole('button', { name: 'Delete account' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
});

test('Export CSV', async ({ page }) => {
  await signIn(page, 'admin', 'admin/users');
  await expect(row(page, ACCOUNTS.reader.email)).toBeVisible();
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await dl).suggestedFilename()).toMatch(/^prayer-book-users-\d{4}-\d{2}-\d{2}\.csv$/);
  const first = readFileSync(await (await dl).path(), 'utf8').replace(/^﻿/, '').split('\n')[0];
  expect(first).toBe('Name,Email,Role,Activated,Joined,Last active,Prayers checked,Days prayed,Current streak,Longest streak,Favorites,Bookmarks,Pages with pen notes');
});
