import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para tests E2E de JellyTunes
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './features',
  timeout: 60 * 1000,
  
  /* Esperar hasta que todos los hooks terminen */
  expect: {
    timeout: 10000,
  },
  
  /* Reporterios */
  reporter: [
    ['html', { outputFolder: './reports/playwright-report' }],
    ['list'],
  ],
  
  /* Configuración de proyectos */
  projects: [
    {
      name: 'electron',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'electron',
      },
    },
  ],
  
  /* Directorio de output */
  outputDir: './test-results/',
});