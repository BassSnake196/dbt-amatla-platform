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
        fondo: 'var(--color-fondo)',
        sidebar: 'var(--color-sidebar)',
        teal: { DEFAULT: 'var(--color-teal)', suave: 'var(--color-teal-suave)' },
        naranja: { DEFAULT: 'var(--color-naranja)', suave: 'var(--color-naranja-suave)' },
        blanco: 'var(--color-blanco)',
        texto: { DEFAULT: 'var(--color-texto)', suave: 'var(--color-texto-suave)' },
        borde: 'var(--color-borde)',
        'crema-hover': 'var(--color-crema-hover)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-lora)', 'Georgia', 'serif'], // títulos de cursos
      },
      fontSize: {
        display: ['2.25rem', { lineHeight: '1.15', fontWeight: '700' }],
        heading: ['1.5rem', { lineHeight: '1.25', fontWeight: '600' }],
        eyebrow: ['0.6875rem', { lineHeight: '1', letterSpacing: '0.08em', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.6' }],
        caption: ['0.8125rem', { lineHeight: '1.5' }],
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
