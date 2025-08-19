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

      // Import rules - enforce top-level ES module imports only
      'import-x/no-commonjs': 'error',
      'import-x/no-dynamic-require': 'error',
      'import-x/no-amd': 'error',
      'import-x/no-import-module-exports': 'error',
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-unused-vars': 'off',

      // General rules
      'no-console': 'error',
      'prefer-const': 'error',

      // Ban dynamic imports - only top-level import declarations allowed
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportExpression',
          message:
            'Dynamic imports are not allowed. Use top-level import declarations only.',
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', 'tests/**/*'],
    rules: {
      'no-console': 'off',
    },
  }
);

