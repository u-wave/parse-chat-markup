module.exports = {
  extends: 'airbnb-base',
  parserOptions: {
    ecmaVersion: 2020,
  },
  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: [
        '@typescript-eslint',
      ],
      extends: [
        'airbnb-base',
        'plugin:@typescript-eslint/recommended',
      ],
      rules: {
        'import/extensions': ['error', 'never'],
        // switch airbnb rules for typescript compatible ones
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'error',
        'no-use-before-define': 'off',
        '@typescript-eslint/no-use-before-define': ['error', { functions: true, classes: true, variables: true }],
      },
      settings: {
        'import/extensions': ['.js', '.ts'],
        'import/resolver': {
          node: {
            extensions: ['.js', '.ts'],
          },
        },
      },
    },
    {
      files: ['test/*.js'],
      parserOptions: {
        sourceType: 'script',
      },
    },
    {
      files: ['.eslintrc.js', 'rollup.config.js', 'test/*.js'],
      env: { node: true },
    },
    {
      files: ['test/*.js'],
      env: { jest: true },
    },
  ],
};
