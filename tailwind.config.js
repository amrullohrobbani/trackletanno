/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './out/**/*.{html,js}',
  ],
  safelist: [
    // Backgrounds
    'bg-gray-700',
    'bg-gray-800', 
    'bg-gray-900',
    'bg-blue-600',
    'bg-green-600',
    'bg-red-600',
    'bg-yellow-600',
    // Text colors
    'text-white',
    'text-gray-300',
    'text-gray-400',
    'text-gray-500',
    'text-blue-400',
    'text-red-400',
    'text-yellow-400',
    // Borders
    'border-gray-600',
    'border-gray-700',
    'border-blue-500',
    'border-yellow-500',
    // Hover states
    'hover:bg-blue-700',
    'hover:bg-gray-600',
    'hover:bg-gray-700',
    'hover:bg-green-700',
    'hover:text-blue-300',
    'hover:text-red-300',
    // Layout
    'h-screen',
    'h-full',
    'flex',
    'flex-col',
    'overflow-hidden',
    'overflow-y-auto',
    'rounded',
    'rounded-lg',
    'p-3',
    'p-4',
    'p-6',
    'mb-2',
    'mb-3',
    'mb-4',
    'mb-6',
    'mt-4',
    'mt-6',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
