import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
// Admin Console tests run against the local Supabase stack (Docker) and only when asked:
// npm run test:admin. Everything else runs offline against the built site and app.
const ADMIN = !!process.env.ADMIN_E2E;

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  globalTimeout: 15 * 60_000, // a stuck run fails instead of hanging CI
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/overcomers/`,
    serviceWorkers: 'block',
  },
  projects: ADMIN
    ? [
        { name: 'admin-setup', testDir: 'tests/admin', testMatch: /global\.setup\.js/ },
        {
          name: 'admin',
          testDir: 'tests/admin',
          dependencies: ['admin-setup'],
          fullyParallel: false,
          use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4310/' },
        },
      ]
    : [
        { name: 'phone', testIgnore: 'admin/**', use: { ...devices['iPhone 15'], browserName: 'chromium' } },
        { name: 'desktop', testIgnore: 'admin/**', use: { ...devices['Desktop Chrome'] } },
      ],
  workers: ADMIN ? 1 : undefined,
  webServer: ADMIN
    ? { command: 'node scripts/admin-e2e-server.mjs', url: 'http://localhost:4310/', reuseExistingServer: !process.env.CI, timeout: 180_000 }
    : {
        command: 'node scripts/serve.mjs',
        url: `http://localhost:${PORT}/overcomers/`,
        reuseExistingServer: !process.env.CI,
        env: { PORT: String(PORT) },
      },
});
