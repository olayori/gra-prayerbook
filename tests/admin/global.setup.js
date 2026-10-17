import { test as setup } from '@playwright/test';
import { localSql, localSupabase } from '../../scripts/lib/local-supabase.mjs';
import { ACCOUNTS } from './helpers.js';

// Test accounts and a clean starting point for every run: no drafts, only edition 0.
setup('accounts and clean drafts', async () => {
  const { API_URL, SERVICE_ROLE_KEY } = localSupabase();
  const headers = { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };
  for (const a of Object.values(ACCOUNTS)) {
    const res = await fetch(`${API_URL}/auth/v1/admin/users`, { method: 'POST', headers, body: JSON.stringify({ email: a.email, password: a.password, email_confirm: true }) });
    if (!res.ok && res.status !== 422) throw new Error(`creating ${a.email}: ${res.status} ${await res.text()}`);
  }
  const ids = (email) => `(select id from auth.users where email = '${email}')`;
  localSql(`
    delete from public.admins where user_id in (select id from auth.users where email like '%@test.local');
    insert into public.admins (user_id, role) values (${ids(ACCOUNTS.editor.email)}, 'editor'), (${ids(ACCOUNTS.admin.email)}, 'admin');
    delete from public.book_draft; delete from public.lib_draft;
    delete from public.book_editions where version > 0;
  `);
});
