import path from 'node:path'
import type { NextConfig } from 'next'

// Next expone process.env.TURBOPACK cuando se corre con `next dev --turbopack`.
const usandoTurbopack = Boolean(process.env.TURBOPACK)

// Regla SOLO para el builder de webpack: pdfjs-dist (react-pdf) viene
// pre-empaquetado como .mjs y desde Next 15.5 webpack lo trata como ESM
// ESTRICTO, lo que rompe el interop interno de pdf.mjs y revienta al evaluarlo
// ("Object.defineProperty called on non-object"). Tratar esos .mjs como
// 'javascript/auto' restaura el manejo flexible de módulos. Turbopack maneja
// esos .mjs de forma NATIVA, así que no necesita esta regla.
const webpackConfig: NonNullable<NextConfig['webpack']> = (config) => {
  config.module?.rules?.push({
    test: /\.mjs$/,
    include: /node_modules/,
    type: 'javascript/auto',
  })
  return config
}

const nextConfig: NextConfig = {
  // Raíz del monorepo — evita que Next infiera mal por lockfiles fuera del proyecto
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  // Paquetes internos del monorepo que Next debe transpilar
  transpilePackages: ['@amatla/shared', '@amatla/ui'],
  // Solo registramos la config de webpack cuando NO corremos con Turbopack; si
  // no, Next avisa "Webpack is configured while Turbopack is not" (la clave
  // webpack se ignora bajo Turbopack y este no necesita la regla .mjs).
  ...(usandoTurbopack ? {} : { webpack: webpackConfig }),
}

export default nextConfig
