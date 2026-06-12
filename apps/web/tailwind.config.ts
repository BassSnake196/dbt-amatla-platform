import type { Config } from 'tailwindcss'

// Paleta DBT.Amatla — las variables CSS viven en src/app/globals.css
const config: Config = {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--color-brand-primary)', // naranja cálido — CTAs, progreso
          secondary: 'var(--color-brand-secondary)', // verde teal — nav activa, completados
          dark: 'var(--color-brand-dark)', // verde noche — headers, textos importantes
          surface: 'var(--color-brand-surface)', // crema suave — fondos de contenido
        },
        danger: 'var(--color-danger)', // alertas de crisis — usar con cuidado
        neutral: {
          50: 'var(--color-neutral-50)',
          100: 'var(--color-neutral-100)',
          900: 'var(--color-neutral-900)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-lora)', 'Georgia', 'serif'], // títulos de cursos
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}

export default config
