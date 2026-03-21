import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["test/vitest.setup.ts"],
    fileParallelism: false,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    testTimeout: 60_000,
    include: ["test/**/*.test.ts"],
  },
});
