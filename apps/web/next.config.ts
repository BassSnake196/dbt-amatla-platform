import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Raíz del monorepo — evita que Next infiera mal por lockfiles fuera del proyecto
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  // Paquetes internos del monorepo que Next debe transpilar
  transpilePackages: ['@amatla/shared', '@amatla/ui'],
}

export default nextConfig
