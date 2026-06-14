import { Settings } from 'lucide-react'
import { Proximamente } from '@/components/layout/proximamente'

export const metadata = { title: 'Configuración — DBT.Amatla' }

export default function ConfiguracionPage() {
  return (
    <Proximamente
      titulo="Configuración"
      descripcion="Aquí podrás ajustar los datos de tu cuenta y tus preferencias. Estamos preparándolo."
      icono={<Settings size={20} />}
    />
  )
}
