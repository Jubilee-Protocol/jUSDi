import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // jUSDi Color Scheme: Black, Green, Jubilee Pink
                'jubilee-pink': '#F377BB',
                'jusdi-green': '#22C55E',
                'jusdi-black': '#0A0A0A',
                // Keep bitcoin-orange for backwards compat, but use green for jUSDi
                'bitcoin-orange': '#22C55E', // Override to green
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
            },
            animation: {
                'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 30px rgba(34, 197, 94, 0.3)' }, // Green glow
                    '50%': { boxShadow: '0 0 50px rgba(34, 197, 94, 0.5)' },
                },
            },
        },
    },
    plugins: [],
};

export default config;
