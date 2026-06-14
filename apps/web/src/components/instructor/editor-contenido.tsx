'use client'

// Editor WYSIWYG (Tiptap) del contenido de lecciones TEXT. Produce HTML que se
// sanitiza SERVER-SIDE al guardar (regla #13) — no se confía en el cliente.

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useRef, useState, useTransition } from 'react'
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Link2Off,
  ImagePlus,
  Loader2,
  Check,
} from 'lucide-react'
import { guardarContenidoLeccionAction } from '@/acciones/lecciones'
import { subirImagenContenido } from '@/lib/subir-imagen-contenido'
import { ImagenContenido } from './extensiones-editor'

function BotonBarra({
  activo,
  onClick,
  etiqueta,
  children,
}: {
  activo?: boolean
  onClick: () => void
  etiqueta: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // no perder el foco del editor
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      className={`rounded p-1.5 transition-colors ${
        activo ? 'bg-brand-secondary text-white' : 'text-brand-dark hover:bg-neutral-100'
      }`}
    >
      {children}
    </button>
  )
}

function BarraHerramientas({
  editor,
  onImagen,
  subiendoImagen,
}: {
  editor: Editor
  onImagen: () => void
  subiendoImagen: boolean
}) {
  function alternarEnlace() {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const url = window.prompt('URL del enlace (https://…):')
    if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-neutral-100 p-2">
      <BotonBarra etiqueta="Negrita" activo={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={15} />
      </BotonBarra>
      <BotonBarra etiqueta="Cursiva" activo={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={15} />
      </BotonBarra>
      <span className="mx-1 h-5 w-px bg-neutral-100" />
      <BotonBarra etiqueta="Título" activo={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={15} />
      </BotonBarra>
      <BotonBarra etiqueta="Subtítulo" activo={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 size={15} />
      </BotonBarra>
      <span className="mx-1 h-5 w-px bg-neutral-100" />
      <BotonBarra etiqueta="Lista con viñetas" activo={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={15} />
      </BotonBarra>
      <BotonBarra etiqueta="Lista numerada" activo={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={15} />
      </BotonBarra>
      <BotonBarra etiqueta="Cita" activo={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={15} />
      </BotonBarra>
      <span className="mx-1 h-5 w-px bg-neutral-100" />
      <BotonBarra etiqueta={editor.isActive('link') ? 'Quitar enlace' : 'Enlace'} activo={editor.isActive('link')} onClick={alternarEnlace}>
        {editor.isActive('link') ? <Link2Off size={15} /> : <Link2 size={15} />}
      </BotonBarra>
      <span className="mx-1 h-5 w-px bg-neutral-100" />
      <BotonBarra etiqueta="Insertar imagen" onClick={onImagen}>
        {subiendoImagen ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
      </BotonBarra>
    </div>
  )
}

export function EditorContenido({
  cursoId,
  leccionId,
  contenidoInicial,
}: {
  cursoId: string
  leccionId: string
  contenidoInicial: string
}) {
  const [pendiente, startTransition] = useTransition()
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const inputImagen = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    immediatelyRender: false, // evita el hydration mismatch en el SSR de Next
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      ImagenContenido,
    ],
    content: contenidoInicial || '<p></p>',
    editorProps: {
      attributes: {
        class: 'contenido-rico min-h-72 px-4 py-3 focus:outline-none',
      },
    },
    onUpdate: () => {
      setGuardado(false)
    },
  })

  function guardar() {
    if (!editor) return
    setError(null)
    const html = editor.getHTML()
    startTransition(async () => {
      const r = await guardarContenidoLeccionAction(cursoId, leccionId, html)
      if (r.error) setError(r.error)
      else setGuardado(true)
    })
  }

  async function alElegirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = '' // permite re-subir el mismo archivo
    if (!archivo || !editor) return
    setError(null)
    setSubiendoImagen(true)
    const r = await subirImagenContenido(cursoId, archivo)
    setSubiendoImagen(false)
    if (r.error !== null) {
      setError(r.error)
      return
    }
    editor.chain().focus().setImage({ src: r.url, 'data-key': r.key } as { src: string }).run()
    setGuardado(false)
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputImagen}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        onChange={alElegirImagen}
        className="hidden"
      />
      <div className="overflow-hidden rounded-card bg-white shadow-card">
        {editor && (
          <BarraHerramientas
            editor={editor}
            onImagen={() => inputImagen.current?.click()}
            subiendoImagen={subiendoImagen}
          />
        )}
        <EditorContent editor={editor} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={pendiente || !editor}
          className="inline-flex items-center gap-2 rounded-full bg-brand-primary px-6 py-2.5 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pendiente ? (
            <Loader2 size={15} className="animate-spin" aria-hidden="true" />
          ) : guardado ? (
            <Check size={15} aria-hidden="true" />
          ) : null}
          {guardado ? 'Guardado' : 'Guardar contenido'}
        </button>
        {error && (
          <p role="alert" className="text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
