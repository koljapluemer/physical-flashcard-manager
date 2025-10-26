module.exports = {
  parser: 'vue-eslint-parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: {
    browser: true,
    es2021: true,
  },
  parserOptions: {
    parser: '@typescript-eslint/parser',
    extraFileExtensions: ['.vue'],
    sourceType: 'module',
    ecmaVersion: 'latest',
  },
  ignorePatterns: ['dist', 'node_modules'],
};
