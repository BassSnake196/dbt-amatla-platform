import { Calendar } from 'lucide-react'
import { Proximamente } from '@/components/layout/proximamente'

export const metadata = { title: 'Calendario — DBT.Amatla' }

export default function CalendarioPage() {
  return (
    <Proximamente
      titulo="Calendario"
      descripcion="Aquí podrás ver tus sesiones en vivo y los recordatorios de tu entrenamiento. Estamos preparándolo."
      icono={<Calendar size={20} />}
    />
  )
}
