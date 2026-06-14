import Link from 'next/link'
import { auth } from '@/auth'
import { iniciarConGoogle } from '@/acciones/auth'
import { apiServer } from '@/lib/api-server'
import { ExploradorPublico } from '@/components/publico/explorador-publico'

export const metadata = { title: 'Cursos · General — DBT.Amatla' }

// Catálogo público "General" — top-level (fuera de (plataforma)), sin gate
// de auth: cualquier visitante puede ver los cursos públicos. Cabecera propia
// con CTA de Google para quienes no tienen sesión.
export default async function GeneralPage() {
  const session = await auth()
  const api = await apiServer()
  const cursos = await api.catalogo.publicos()

  return (
    <div className="min-h-dvh bg-fondo">
      <header className="border-b border-borde bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/general" className="font-serif text-xl font-semibold tracking-wide text-texto">
            DBT.<span className="text-naranja">Amatla</span>
          </Link>

          {session?.user ? (
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border border-borde bg-white px-4 py-2.5 text-sm font-semibold text-texto hover:bg-crema-hover"
            >
              Ir a mi plataforma
            </Link>
          ) : (
            <form action={iniciarConGoogle}>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-3 rounded-lg border border-borde bg-white px-4 py-2.5 text-sm font-semibold text-texto hover:bg-crema-hover"
              >
                <GoogleIcon />
                Continuar con Google
              </button>
            </form>
          )}
        </div>
      </header>

      {/* Hero de marca */}
      <section className="relative overflow-hidden bg-sidebar text-white">
        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-20">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 top-1/2 -translate-y-1/2 select-none font-serif text-[20rem] leading-none text-white/10"
          >
            Ψ
          </span>

          <p className="text-eyebrow uppercase tracking-wider text-naranja">
            Entrenamiento en habilidades DBT
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-tight md:text-5xl">
            Habilidades que se practican, no solo se aprenden.
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/70 md:text-lg">
            Cursos abiertos de terapia dialéctico-conductual para acompañarte, paso a paso y a tu
            ritmo.
          </p>

          <div className="relative mt-8">
            {session?.user ? (
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-3 rounded-lg bg-naranja px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
              >
                Ir a mi plataforma
              </Link>
            ) : (
              <form action={iniciarConGoogle}>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-3 rounded-lg bg-naranja px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  <GoogleIcon />
                  Continuar con Google
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-heading text-texto">Cursos disponibles</h2>
        <p className="mt-1 text-body text-texto-suave">
          Explora y abre un curso para empezar.
        </p>

        <div className="mt-6">
          <ExploradorPublico cursos={cursos} sesionActiva={!!session?.user} />
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
