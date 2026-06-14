import Link from 'next/link'
import { auth } from '@/auth'
import { iniciarConGoogle } from '@/acciones/auth'
import { apiServer } from '@/lib/api-server'
import { CatalogoPublico } from '@/components/publico/catalogo-publico'

export const metadata = { title: 'Cursos · General — DBT.Amatla' }

// Catálogo público "General" — top-level (fuera de (plataforma)), sin gate
// de auth: cualquier visitante puede ver los cursos públicos. Cabecera propia
// con CTA de Google para quienes no tienen sesión.
export default async function GeneralPage() {
  const session = await auth()
  const api = await apiServer()
  const cursos = await api.catalogo.publicos()

  return (
    <div className="min-h-dvh bg-neutral-50">
      <header className="border-b border-neutral-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/general" className="font-serif text-xl font-semibold tracking-wide text-brand-dark">
            DBT.<span className="text-brand-primary">Amatla</span>
          </Link>

          {session?.user ? (
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-100 bg-white px-4 py-2.5 text-sm font-semibold text-brand-dark shadow-card transition-colors hover:bg-neutral-100"
            >
              Ir a mi plataforma
            </Link>
          ) : (
            <form action={iniciarConGoogle}>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-3 rounded-lg border border-neutral-100 bg-white px-4 py-2.5 text-sm font-semibold text-brand-dark shadow-card transition-colors hover:bg-neutral-100"
              >
                <GoogleIcon />
                Continuar con Google
              </button>
            </form>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-serif text-3xl font-semibold text-brand-dark">Cursos disponibles</h1>
        <p className="mt-2 text-sm text-neutral-900/60">
          Explora los cursos abiertos de DBT.Amatla. Inicia sesión para acceder al contenido.
        </p>

        <div className="mt-8">
          <CatalogoPublico cursos={cursos} sesionActiva={!!session?.user} />
        </div>
      </main>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}
