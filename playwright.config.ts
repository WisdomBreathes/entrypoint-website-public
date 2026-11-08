import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4329';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL,
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'Chromium', use: { browserName: 'chromium' } },
    { name: 'WebKit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4329',
    url: baseURL,
  },
});
