import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'e2e/**/*.spec.ts',
    supportFile: 'e2e/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
})
