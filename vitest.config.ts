import { sharedConfig } from '@sevendays/config/vitest';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  ...sharedConfig,
  test: {
    passWithNoTests: true,
    projects: [
      {
        root: './packages',
        test: {
          ...sharedConfig.test,
          // Project-specific configuration for packages
          // ...
        },
      },
      {
        root: './apps',
        test: {
          ...sharedConfig.test,
          // Deliberately no environment here: each workspace's own
          // vitest.config.ts owns that (ADR-0003), and jsdom is installed
          // per-workspace the day a workspace's tests need a DOM.
        },
      },
    ],
  },
});
