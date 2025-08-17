import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import-x';
import globals from 'globals';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      'import-x': importPlugin,
    },
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],

      // Import rules
      'import-x/no-commonjs': 'error',

      // General rules
      'no-console': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['**/*.test.ts', 'tests/**/*'],
    rules: {
      'no-console': 'off',
    },
  }
);