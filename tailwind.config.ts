import type { Config } from 'tailwindcss'

/**
 * HOMS / SVCE Tailwind theme extension.
 *
 * Usage: bg-svce-primary-blue, text-svce-text-secondary, p-svce-4, rounded-svce-md, etc.
 *
 * Wire into Tailwind v4 by adding to your CSS entry file:
 *   @import "tailwindcss";
 *   @config "../tailwind.config.ts";
 */
export default {
  theme: {
    extend: {
      colors: {
        svce: {
          'primary-blue': '#1A5CA0',
          'dark-blue': '#0D3F72',
          'blue-tint': '#EBF3FF',
          'accent-orange': '#E87722',
          'orange-tint': '#FFF3E8',
          'accent-green': '#2E8B44',
          'green-tint': '#EBF7EE',
          white: '#FFFFFF',
          'page-bg': '#F5F7FA',
          'text-primary': '#1A1A2E',
          'text-secondary': '#4B5563',
          'text-muted': '#9CA3AF',
          'border-default': '#E5E7EB',
          'border-strong': '#D1D5DB',
          success: '#2E8B44',
          'success-tint': '#EBF7EE',
          warning: '#D97706',
          'warning-tint': '#FFF8E1',
          danger: '#DC2626',
          'danger-tint': '#FEF2F2',
          info: '#1A5CA0',
          'info-tint': '#EBF3FF',
        },
      },

      spacing: {
        svce: {
          '1': '4px',
          '2': '8px',
          '3': '12px',
          '4': '16px',
          '5': '20px',
          '6': '24px',
          '8': '32px',
          '10': '40px',
        },
      },

      borderRadius: {
        'svce-sm': '6px',
        'svce-md': '8px',
        'svce-lg': '12px',
        'svce-xl': '16px',
        'svce-full': '9999px',
      },

      fontFamily: {
        svce: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'svce-mono': ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        'svce-h1': ['28px', { lineHeight: '1.25', fontWeight: '600' }],
        'svce-h2': ['22px', { lineHeight: '1.3', fontWeight: '600' }],
        'svce-h3': ['18px', { lineHeight: '1.35', fontWeight: '600' }],
        'svce-h4': ['15px', { lineHeight: '1.4', fontWeight: '600' }],
        'svce-body': ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        'svce-small': ['12px', { lineHeight: '1.5', fontWeight: '500' }],
      },

      width: {
        'svce-sidebar': '240px',
        'svce-sidebar-collapsed': '64px',
      },

      height: {
        'svce-topbar': '60px',
        'svce-table-row': '52px',
      },

      padding: {
        'svce-card': '20px',
      },

      boxShadow: {
        svce: 'none',
      },
    },
  },
} satisfies Config
