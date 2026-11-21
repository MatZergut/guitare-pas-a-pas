import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'fr-FR',
  },
  projects: [
    // Profil Android milieu de gamme, largeur 412 px.
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'petit-ecran', testIgnore: '**/tuner.spec.ts', use: { ...devices['Galaxy S9+'], viewport: { width: 360, height: 740 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
