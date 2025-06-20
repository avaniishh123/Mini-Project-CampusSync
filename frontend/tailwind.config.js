const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Material Design 3 - Expressive Style
        
        // Blue Theme (Ocean)
        primary: {
          light: '#B4D0FD',
          main: '#0B57D0',
          dark: '#0842A0',
          contrast: '#FFFFFF',
          container: '#D3E3FD',
          DEFAULT: '#0B57D0',
          50: '#EBF2FF',
          100: '#D3E3FD',
          200: '#B4D0FD',
          300: '#84ADFA',
          400: '#5080F5',
          500: '#0B57D0',
          600: '#0842A0',
          700: '#072E72',
          800: '#051B44',
          900: '#030D22',
        },
        
        /* Original Purple Theme
        primary: {
          light: '#D0BCFF',
          main: '#6750A4',
          dark: '#381E72',
          contrast: '#FFFFFF',
          container: '#EADDFF',
          DEFAULT: '#6750A4',
          50: '#F5EEFF',
          100: '#EADDFF',
          200: '#D0BCFF',
          300: '#B69DF8',
          400: '#9A82DB',
          500: '#6750A4',
          600: '#4F378B',
          700: '#381E72',
          800: '#1E1148',
          900: '#0C0524',
        },
        */
        secondary: {
          light: '#C0CDEB',
          main: '#4A5680',
          dark: '#2E3650',
          contrast: '#FFFFFF',
          container: '#DCE4F9',
          DEFAULT: '#4A5680',
          50: '#F0F4FC',
          100: '#DCE4F9',
          200: '#C0CDEB',
          300: '#8C9CC8',
          400: '#6A7AA6',
          500: '#4A5680',
          600: '#394263',
          700: '#2E3650',
          800: '#1A1F2E',
          900: '#0D0F17',
        },
        
        /* Original Secondary Theme
        secondary: {
          light: '#CCC2DC',
          main: '#625B71',
          dark: '#332D41',
          contrast: '#FFFFFF',
          container: '#E8DEF8',
          DEFAULT: '#625B71',
          50: '#F6F2FB',
          100: '#E8DEF8',
          200: '#CCC2DC',
          300: '#9E95B2',
          400: '#7A7289',
          500: '#625B71',
          600: '#4A4458',
          700: '#332D41',
          800: '#1D192B',
          900: '#0E0B15',
        },
        */
        
        tertiary: {
          light: '#B8D4EF',
          main: '#0A6CAD',
          dark: '#064973',
          contrast: '#FFFFFF',
          container: '#D8E8F8',
          DEFAULT: '#0A6CAD',
          50: '#EBF5FD',
          100: '#D8E8F8',
          200: '#B8D4EF',
          300: '#7AAED7',
          400: '#3D88C0',
          500: '#0A6CAD',
          600: '#085A90',
          700: '#064973',
          800: '#04304C',
          900: '#021825',
        },
        
        /* Original Tertiary Theme
        tertiary: {
          light: '#EFB8C8',
          main: '#7D5260',
          dark: '#4A2532',
          contrast: '#FFFFFF',
          container: '#FFD8E4',
          DEFAULT: '#7D5260',
          50: '#FFF5F8',
          100: '#FFD8E4',
          200: '#EFB8C8',
          300: '#D29DAD',
          400: '#A67786',
          500: '#7D5260',
          600: '#633E4C',
          700: '#4A2532',
          800: '#31121B',
          900: '#180809',
        },
        */
        surface: {
          main: '#FFFFFF',
          dark: '#1C1B1F',
          variant: '#F5F5F5',
          container: '#F9F9F9',
          containerLow: '#FCFCFC',
          containerHigh: '#F0F0F0',
          DEFAULT: '#FFFFFF',
        },
        
        /* Original Surface Colors (Pink-tinted)
        surface: {
          main: '#FEF7FF',
          dark: '#1C1B1F',
          variant: '#E7E0EC',
          container: '#F3EDF7',
          containerLow: '#F7F2FA',
          containerHigh: '#ECE6F0',
          DEFAULT: '#FEF7FF',
        },
        */
        error: {
          light: '#F2B8B5',
          main: '#B3261E',
          dark: '#601410',
          contrast: '#FFFFFF',
          container: '#F9DEDC',
          DEFAULT: '#B3261E',
          50: '#FFF8F7',
          100: '#F9DEDC',
          200: '#F2B8B5',
          300: '#E5928E',
          400: '#D26D69',
          500: '#B3261E',
          600: '#8C1D18',
          700: '#601410',
          800: '#370B0A',
          900: '#180404',
        },
        background: {
          light: '#FEF7FF',
          dark: '#141218',
          DEFAULT: '#FEF7FF',
        },
        // Material 3 semantic color tokens
        'on-primary': '#FFFFFF',
        'on-primary-container': '#21005E',
        'on-secondary': '#FFFFFF',
        'on-secondary-container': '#1D192B',
        'on-tertiary': '#FFFFFF',
        'on-tertiary-container': '#31111D',
        'on-surface': '#1C1B1F',
        'on-surface-variant': '#49454F',
        'on-error': '#FFFFFF',
        'on-error-container': '#410E0B',
        'on-background': '#1C1B1F',
        'outline': '#79747E',
        'outline-variant': '#CAC4D0',
        'scrim': 'rgba(0, 0, 0, 0.4)'
      },
      animation: {
        'ripple': 'ripple 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale': 'scale 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'float': 'float 3s ease-in-out infinite',
        'expand': 'expand 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in': 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scale: {
          '0%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        expand: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      boxShadow: {
        'elevation-1': '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15)',
        'elevation-2': '0 2px 4px rgba(0,0,0,0.3), 0 3px 6px rgba(0,0,0,0.15)',
        'elevation-3': '0 4px 8px rgba(0,0,0,0.3), 0 6px 12px rgba(0,0,0,0.15)',
        'elevation-4': '0 6px 12px rgba(0,0,0,0.3), 0 8px 16px rgba(0,0,0,0.15)',
        'elevation-5': '0 8px 16px rgba(0,0,0,0.3), 0 12px 24px rgba(0,0,0,0.15)',
      },
      transitionTimingFunction: {
        'material': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        '300': '300ms',
      },
    },
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.transition-material': {
          'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
          'transition-duration': '300ms',
        },
        '.transition-emphasized': {
          'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
          'transition-duration': '500ms',
        },
        '.transition-emphasized-decelerate': {
          'transition-timing-function': 'cubic-bezier(0, 0, 0, 1)',
          'transition-duration': '400ms',
        },
        '.transition-emphasized-accelerate': {
          'transition-timing-function': 'cubic-bezier(0.3, 0, 0.8, 0.15)',
          'transition-duration': '400ms',
        },
      })
    }),
  ],
}