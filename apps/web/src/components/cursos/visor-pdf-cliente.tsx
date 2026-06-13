'use client'

// pdf.js necesita APIs del navegador (DOMMatrix, canvas) que no existen en
// el SSR de Node — el visor se carga solo en el cliente.

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { VisorPdfProps } from './visor-pdf'

const VisorPdf = dynamic(() => import('./visor-pdf'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-64 items-center justify-center rounded-card bg-white text-brand-secondary shadow-card">
      <Loader2 className="animate-spin" size={28} aria-label="Cargando visor" />
    </div>
  ),
})

export function VisorPdfCliente(props: VisorPdfProps) {
  return <VisorPdf {...props} />
}
