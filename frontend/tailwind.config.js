/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                navy: {
                    900: '#061528',
                    800: '#0A2342', // Primary Brand (Deep Corporate Navy)
                    700: '#15325A', // Lighter nav/headers
                    50: '#F0F4F8',  // Lightest tint
                },
                gold: {
                    400: '#E5C558',
                    500: '#D4AF37', // Primary Gold (Metallic)
                    600: '#B69224',
                },
                emerald: {
                    500: '#10B981', // Financial Positive
                    600: '#059669',
                },
                flint: {
                    50: '#F8FAFC',
                    100: '#F7F7F7', // Main Background (Blanco Perla)
                    200: '#E2E8F0', // Borders
                    300: '#CBD5E1',
                    500: '#64748B', // Secondary Text
                    800: '#1E293B', // Primary Text
                },
                klein: {
                    500: '#002BFF', // Azul Klein principal
                    600: '#0022CC', // Hover Azul Klein
                },
                white: '#FFFFFF',
            },
            fontFamily: {
                sans: ['"Basier Square"', '"DM Sans"', 'system-ui', 'sans-serif'],
                serif: ['"Basier Square"', '"DM Sans"', 'serif'],
            },
            boxShadow: {
                'soft-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
                'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            },
            backgroundImage: {
                'gradient-gold': 'linear-gradient(135deg, #D4AF37 0%, #F3D97F 50%, #B69224 100%)',
            }
        },
    },
    plugins: [],
}
