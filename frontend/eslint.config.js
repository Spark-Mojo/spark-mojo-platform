import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  {
    // Ignore built output and all legacy pre-migration components.
    // Legacy files are not touched per CLAUDE.md — they are excluded from linting.
    ignores: [
      'dist',
      'src/components/auth/**',
      'src/components/cash/**',
      'src/components/clients/**',
      'src/components/common/**',
      'src/components/customer/**',
      'src/components/customers/**',
      'src/components/dashboard/**',
      'src/components/events/**',
      'src/components/expenses/**',
      'src/components/financial/**',
      'src/components/import-export/**',
      'src/components/inventory/**',
      'src/components/invoice/**',
      'src/components/layout/**',
      'src/components/notifications/**',
      'src/components/orders/**',
      'src/components/pos/**',
      'src/components/printing/**',
      'src/components/quickrepairs/**',
      'src/components/reports/**',
      'src/components/security/**',
      'src/components/services/**',
      'src/components/settings/**',
      'src/components/shared/**',
      'src/components/technicians/**',
      'src/components/tenant/**',
      'src/components/timetracking/**',
      'src/components/unlocks/**',
      'src/components/users/**',
      'src/components/utils/**',
      'src/components/widgets/**',
      'src/components/wizard/**',
      'src/components/workorder/**',
      'src/components/api/**',
      'src/components/Auth.jsx',
      'src/components/UserNotRegisteredError.jsx',
      'src/api/**',
      'src/Entities/**',
      'src/types/**',
    ],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
