// Seed de media local — repara los PDF de las lecciones PDF (del seed o de dev)
// cuyo archivo en el almacén local (.almacen-dev) FALTA o está MALFORMADO.
//
// Motivo: un placeholder de seed quedó como un PDF inválido (cabecera + %%EOF
// pero SIN /Pages ni tabla xref) → react-pdf/pdfjs lanzaba
// "InvalidPDFException: Invalid PDF structure". Este script escribe en su lugar
// un PDF de UNA página VÁLIDO (con xref de offsets correctos). NO toca PDFs
// reales ya subidos (se detectan como válidos y se omiten).
//
// Uso (desde la raíz del monorepo, o `npm run db:seed-media -w @amatla/db`):
//   node --env-file=packages/db/.env packages/db/seed-media.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const ALMACEN_DIR = process.env.STORAGE_LOCAL_DIR ?? resolve(process.cwd(), '.almacen-dev')

/** PDF de una página válido con la tabla xref (offsets en bytes) bien calculada. */
function pdfUnaPagina(titulo) {
  // El texto del Content va en ASCII y con paréntesis/backslash escapados
  const texto = String(titulo)
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/([()\\])/g, '\\$1')
  const contenido = `BT /F1 22 Tf 72 720 Td (${texto}) Tj ET\n`
  const cuerpos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(contenido, 'latin1')} >>\nstream\n${contenido}endstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = []
  cuerpos.forEach((cuerpo, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'))
    pdf += `${i + 1} 0 obj\n${cuerpo}\nendobj\n`
  })
  const inicioXref = Buffer.byteLength(pdf, 'latin1')
  pdf += `xref\n0 ${cuerpos.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${cuerpos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}

/** Heurística de validez: header + /Pages + xref + %%EOF y tamaño razonable. */
function esPdfValido(buf) {
  const s = buf.toString('latin1')
  return (
    buf.length > 200 &&
    s.startsWith('%PDF-') &&
    s.includes('/Pages') &&
    s.includes('xref') &&
    s.includes('%%EOF')
  )
}

const lecciones = await prisma.lesson.findMany({
  where: { type: 'PDF', fileKey: { not: null } },
  select: { id: true, title: true, fileKey: true },
})

let reparados = 0
for (const leccion of lecciones) {
  const ruta = join(ALMACEN_DIR, leccion.fileKey)
  let valido = false
  if (existsSync(ruta)) {
    try {
      valido = esPdfValido(await readFile(ruta))
    } catch {
      valido = false
    }
  }
  if (valido) {
    console.log(`✓ OK       ${leccion.fileKey}`)
    continue
  }
  await mkdir(dirname(ruta), { recursive: true })
  await writeFile(ruta, pdfUnaPagina(leccion.title))
  reparados++
  console.log(`⟳ reparado ${leccion.fileKey}  (${leccion.title})`)
}

console.log(`\nListo. ${reparados} archivo(s) reparado(s) de ${lecciones.length} lección(es) PDF.`)
await prisma.$disconnect()
