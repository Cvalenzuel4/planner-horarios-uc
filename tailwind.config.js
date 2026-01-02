/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Semantic theme colors
                background: 'hsl(var(--background))',
                surface: 'hsl(var(--surface))',
                'surface-hover': 'hsl(var(--surface-hover))',
                foreground: 'hsl(var(--foreground))',
                muted: 'hsl(var(--muted))',
                'muted-foreground': 'hsl(var(--muted-foreground))',
                'border-color': 'hsl(var(--border))',
                ring: 'hsl(var(--ring))',
                'th-primary': {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                // Colores para tipos de actividad
                catedra: '#FBBF24',      // amber-400
                laboratorio: '#7DD3FC',   // sky-300
                ayudantia: '#34D399',     // emerald-400
                taller: '#C084FC',        // purple-400
                terreno: '#B45309',       // amber-700
                practica: '#DC2626',      // red-600
                otro: '#9CA3AF',          // gray-400
                conflicto: '#EF4444',     // red-500
            },
            animation: {
                'pulse-conflict': 'pulseConflict 1s ease-in-out infinite',
            },
            keyframes: {
                pulseConflict: {
                    '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' },
                    '50%': { boxShadow: '0 0 0 4px rgba(239, 68, 68, 0)' },
                },
            },
        },
    },
    plugins: [],
}
