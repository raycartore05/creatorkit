import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// Use the system Chrome if present (CI images often ship one); otherwise
// fall back to Playwright's own Chromium (`npx playwright install chromium`).
const systemChrome = ['/opt/google/chrome/chrome', '/usr/bin/google-chrome'].find((p) => existsSync(p));
const launchOptions = systemChrome ? { executablePath: systemChrome } : {};

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173',
    acceptDownloads: true,
    launchOptions,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions }, grep: /@mobile/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: 'node scripts/serve-dist.mjs 4173', url: 'http://localhost:4173', reuseExistingServer: true },
});
