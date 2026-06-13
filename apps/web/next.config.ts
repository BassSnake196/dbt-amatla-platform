import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Raíz del monorepo — evita que Next infiera mal por lockfiles fuera del proyecto
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  // Paquetes internos del monorepo que Next debe transpilar
  transpilePackages: ['@amatla/shared', '@amatla/ui'],
  // Turbopack maneja la interop CJS/ESM de los .mjs de pdfjs-dist de forma
  // NATIVA, así que NO necesita la regla de webpack de abajo. Declaramos esta
  // clave (aunque vacía) para que Next no avise "Webpack is configured while
  // Turbopack is not" al correr con `next dev --turbopack`.
  turbopack: {},
  webpack: (config) => {
    // pdfjs-dist (react-pdf) se distribuye pre-empaquetado como .mjs. Desde
    // Next 15.5 el webpack trata los .mjs de node_modules como ESM ESTRICTO, lo
    // que rompe el interop interno del bundle de pdf.mjs y revienta al evaluarlo
    // ("Object.defineProperty called on non-object"). Tratar esos .mjs como
    // 'javascript/auto' restaura el manejo flexible de módulos y el visor PDF
    // vuelve a cargar. (Solo aplica al builder de webpack, no a Turbopack.)
    config.module?.rules?.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    })
    return config
  },
}

export default nextConfig
