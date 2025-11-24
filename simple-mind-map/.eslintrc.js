module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    indent: ['error', 2, { SwitchCase: 1 }],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single'],
    semi: ['error', 'never'],
    'comma-dangle': ['error', 'never'],
    'no-console': 'warn',
    'no-debugger': 'warn'
  }
}
