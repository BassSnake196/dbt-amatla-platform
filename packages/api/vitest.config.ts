import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Tests de integración contra el PostgreSQL local — sin paralelismo
    fileParallelism: false,
  },
})
