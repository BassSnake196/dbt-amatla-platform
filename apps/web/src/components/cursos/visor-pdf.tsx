'use client'

// Visor PDF inline (react-pdf / pdf.js) — URL firmada con TTL 30 min.
// Sin capas de texto/anotaciones: el contenido no es seleccionable ni
// copiable, coherente con el modo "solo lectura inline" cuando el
// instructor bloquea la descarga. Al cargar el documento se marca la
// lección como vista (completada) y se refresca el índice.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Download, Loader2 } from 'lucide-react'
import { Document, Page, pdfjs } from 'react-pdf'
import { marcarMaterialVistoAction } from '@/acciones/estudiante'

// El worker de pdf.js se sirve desde /public (copiado de pdfjs-dist en su
// versión EXACTA). Evita el frágil `new URL(..., import.meta.url)` que no
// resuelve en runtime con el bundler de Next. Si se actualiza pdfjs-dist,
// recopiar: cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs apps/web/public/
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export interface VisorPdfProps {
  leccionId: string
  url: string
  permitirDescarga: boolean
}

export default function VisorPdf({ leccionId, url, permitirDescarga }: VisorPdfProps) {
  const router = useRouter()
  const [totalPaginas, setTotalPaginas] = useState<number | null>(null)
  const [pagina, setPagina] = useState(1)
  const [fallo, setFallo] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState<number>()
  const vistoRef = useRef(false)

  // Ancho responsive: la página del PDF llena el contenedor
  useEffect(() => {
    const contenedor = contenedorRef.current
    if (!contenedor) return
    const observador = new ResizeObserver(([entrada]) => {
      if (entrada) setAncho(Math.floor(entrada.contentRect.width))
    })
    observador.observe(contenedor)
    return () => observador.disconnect()
  }, [])

  async function alCargarDocumento({ numPages }: { numPages: number }) {
    setTotalPaginas(numPages)
    // Abrir el material = lección vista (una sola vez por montaje)
    if (!vistoRef.current) {
      vistoRef.current = true
      const r = await marcarMaterialVistoAction(leccionId)
      if (r.completadaAhora) router.refresh()
    }
  }

  if (fallo) {
    return (
      <div className="rounded-card bg-white p-10 text-center shadow-card">
        <p className="text-sm text-neutral-900/60">
          No se pudo mostrar el documento. Recarga la página; si persiste, avisa a tu terapeuta.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-card bg-white shadow-card">
      <div ref={contenedorRef}>
        <Document
          file={url}
          onLoadSuccess={alCargarDocumento}
          onLoadError={() => setFallo(true)}
          loading={
            <div className="flex min-h-64 items-center justify-center text-brand-secondary">
              <Loader2 className="animate-spin" size={28} aria-label="Cargando documento" />
            </div>
          }
        >
          <Page
            pageNumber={pagina}
            width={ancho}
            renderTextLayer={false}
            renderAnnotationLayer={false}
          />
        </Document>
      </div>

      {totalPaginas !== null && (
        <div className="flex items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina <= 1}
              className="rounded-full p-1.5 text-brand-dark transition-colors hover:bg-neutral-100 disabled:opacity-30"
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-neutral-900/60">
              Página {pagina} de {totalPaginas}
            </span>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina >= totalPaginas}
              className="rounded-full p-1.5 text-brand-dark transition-colors hover:bg-neutral-100 disabled:opacity-30"
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {permitirDescarga && (
            <a
              href={url}
              download
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-secondary px-4 py-1.5 text-xs font-semibold text-brand-secondary transition-colors hover:bg-brand-secondary hover:text-white"
            >
              <Download size={13} aria-hidden="true" />
              Descargar
            </a>
          )}
        </div>
      )}
    </div>
  )
}
