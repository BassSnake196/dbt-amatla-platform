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
              className="flex w-full max-w-[340px] items-center justify-center gap-3 rounded-[10px] border-[1.5px] border-borde bg-white px-6 py-3.5 text-[15px] font-medium text-texto shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:translate-y-0 active:scale-[0.98] active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
