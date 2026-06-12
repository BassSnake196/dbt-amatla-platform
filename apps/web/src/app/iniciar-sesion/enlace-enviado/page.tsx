import { MailCheck } from 'lucide-react'

export const metadata = { title: 'Revisa tu correo — DBT.Amatla' }

export default function EnlaceEnviadoPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-card bg-white p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-surface">
          <MailCheck className="text-brand-secondary" size={26} aria-hidden="true" />
        </div>
        <h1 className="mt-5 font-serif text-2xl font-semibold text-brand-dark">
          Revisa tu correo
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-900/60">
          Te enviamos un enlace de acceso. Ábrelo desde este dispositivo para entrar a la
          plataforma. Si no llega en unos minutos, revisa tu carpeta de spam.
        </p>
      </div>
    </main>
  )
}
