import { Bell } from 'lucide-react'
import { Proximamente } from '@/components/layout/proximamente'

export const metadata = { title: 'Notificaciones — DBT.Amatla' }

export default function NotificacionesPage() {
  return (
    <Proximamente
      titulo="Notificaciones"
      descripcion="Aquí recibirás avisos sobre tus cursos, nuevas lecciones y tu progreso. Estamos preparándolo."
      icono={<Bell size={20} />}
    />
  )
}
