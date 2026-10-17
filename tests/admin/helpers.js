import { expect } from '@playwright/test';
import { localSql } from '../../scripts/lib/local-supabase.mjs';

export const ACCOUNTS = {
  editor: { email: 'editor@test.local', password: 'editor-pass-1' },
  admin: { email: 'admin@test.local', password: 'admin-pass-1' },
  reader: { email: 'reader@test.local', password: 'reader-pass-1' },
};

// Opens the console and signs in with the console's own form.
export async function signIn(page, who, path = 'admin/content') {
  await page.goto(`#/${path}`);
  await page.getByLabel('Email').fill(ACCOUNTS[who].email);
  await page.getByLabel('Password').fill(ACCOUNTS[who].password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 15_000 });
}

export const db = (sql) => localSql(sql);
