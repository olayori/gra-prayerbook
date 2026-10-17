import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/overcomers/`,
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'phone', use: { ...devices['iPhone 15'], browserName: 'chromium' } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'node scripts/serve.mjs',
    url: `http://localhost:${PORT}/overcomers/`,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT) },
  },
});
