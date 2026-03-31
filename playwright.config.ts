import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 2,  // handles transient flakiness in automated runs — essential for overnight
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],  // 'never' is critical — prevents hanging on open attempt
    ['line'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',       // captures trace on failure for morning review
    screenshot: 'only-on-failure', // saves screenshots on failure
    video: 'retain-on-failure',    // saves video on failure
  },
  webServer: {
    command: 'npm run start:test',  // use a test-mode start command, not production
    url: 'http://localhost:3000',
    reuseExistingServer: false,     // always start fresh — don't reuse a stale server
    timeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});