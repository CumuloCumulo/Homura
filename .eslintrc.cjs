/**
 * =============================================================================
 * ESLint Configuration
 * =============================================================================
 *
 * Code style and quality rules for Homura project
 */

const path = require('path');

module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
    webextensions: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: [
      './tsconfig.json',
      './packages/sdk/tsconfig.json',
    ],
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: false,
      },
    ],

    // Import rules
    'no-duplicate-imports': 'error',

    // General code quality
    'no-console': 'off', // 允许 console（调试用）
    'no-debugger': 'warn',

    // Style (can be overridden by Prettier)
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],

    // 禁用 React Hooks 规则（未配置插件）
    'react-hooks/exhaustive-deps': 'off',

    // 空块语句允许（TODO 注释）
    'no-empty': 'warn',
  },
  ignorePatterns: [
    'dist',
    'build',
    'node_modules',
    '*.config.js',
    '*.config.ts',
    'vite.config.ts',
    '**/__tests__/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    'templates/**',
    'test/**',
    'vitest.config.ts',
  ],
};
