import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    // Tests de integración contra Postgres/ClamAV locales — sin paralelismo
    // para no pisarse los datos de prueba.
    fileParallelism: false,
  },
})
