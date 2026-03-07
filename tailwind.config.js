import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        cardForeground: 'hsl(var(--card-foreground))',
        border: 'hsl(var(--border))',
        muted: 'hsl(var(--muted))',
        mutedForeground: 'hsl(var(--muted-foreground))',
        primary: 'hsl(var(--primary))',
        primaryForeground: 'hsl(var(--primary-foreground))',
        secondary: 'hsl(var(--secondary))',
        secondaryForeground: 'hsl(var(--secondary-foreground))',
        accent: 'hsl(var(--accent))',
        accentForeground: 'hsl(var(--accent-foreground))',
        destructive: 'hsl(var(--destructive))',
        destructiveForeground: 'hsl(var(--destructive-foreground))',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      fontFamily: {
        body: ['"Nunito Sans"', ...defaultTheme.fontFamily.sans],
        display: ['"Cinzel"', ...defaultTheme.fontFamily.serif],
      },
      backgroundImage: {
        'royal-gradient':
          'radial-gradient(circle at top, rgba(212,175,55,0.17), transparent 40%), linear-gradient(140deg, rgba(27, 20, 42, 0.95) 0%, rgba(10, 10, 22, 1) 55%, rgba(20, 29, 47, 0.96) 100%)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        floatUp: {
          '0%': { opacity: 0.9, transform: 'translateY(0px)' },
          '100%': { opacity: 0, transform: 'translateY(-64px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.5s linear infinite',
        floatUp: 'floatUp 900ms ease-out forwards',
      },
    },
  },
  plugins: [],
};
