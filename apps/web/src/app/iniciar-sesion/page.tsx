import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { iniciarConGoogle } from '@/acciones/auth'

export const metadata = { title: 'Iniciar sesión — DBT.Amatla' }

export default async function IniciarSesionPage() {
  // Si ya hay sesión, directo a la plataforma
  const session = await auth()
  if (session?.user) redirect('/')

  return (
    <div className="flex min-h-dvh">
      {/* Panel de marca — visible desde md */}
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-brand-dark p-10 text-white md:flex">
        <span
          className="pointer-events-none absolute -right-16 top-1/2 -translate-y-1/2 select-none font-serif text-[28rem] leading-none text-brand-secondary/20"
          aria-hidden="true"
        >
          Ψ
        </span>
        <p className="relative font-serif text-xl font-semibold tracking-wide">
          DBT.<span className="text-brand-primary">Amatla</span>
        </p>
        <blockquote className="relative max-w-md">
          <p className="font-serif text-3xl leading-snug">
            “Aprender a estar presente es la primera habilidad. Las demás llegan con práctica.”
          </p>
          <footer className="mt-4 text-sm text-white/60">
            Entrenamiento en habilidades DBT · Modalidad RO
          </footer>
        </blockquote>
        <p className="relative text-xs text-white/40">
          Espacio seguro, profesional y confidencial.
        </p>
      </aside>

      {/* Formulario */}
      <main className="flex flex-1 items-center justify-center bg-neutral-50 px-4 py-10">
        <div className="w-full max-w-sm">
          <p className="font-serif text-xl font-semibold tracking-wide text-brand-dark md:hidden">
            DBT.<span className="text-brand-primary">Amatla</span>
          </p>
          <h1 className="mt-6 font-serif text-3xl font-semibold text-brand-dark md:mt-0">
            Hola de nuevo
          </h1>
          <p className="mt-2 text-sm text-neutral-900/60">
            Entra con tu cuenta de Google para acceder a tu plataforma.
          </p>

          <form action={iniciarConGoogle} className="mt-8">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-3 rounded-lg bg-brand-primary px-4 py-3 text-sm font-semibold text-brand-dark transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              <GoogleIcon />
              Continuar con Google
            </button>
          </form>

          <p className="mt-8 text-center text-xs leading-relaxed text-neutral-900/50">
            Al entrar aceptas el aviso de privacidad. Tus datos de salud se almacenan cifrados
            conforme a la LFPDPPP.
          </p>
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
