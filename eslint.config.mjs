import forAi from 'eslint-for-ai';

export default [
  ...forAi.configs.recommended,
  {
    settings: {
      'import-x/resolver': {
        typescript: true,
      },
      'import-x/core-modules': ['bun:test'],
    },
    rules: {
      'for-ai/no-standalone-class': 'off',
    },
  },
];
