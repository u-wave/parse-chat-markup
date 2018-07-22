import babel from 'rollup-plugin-babel';

const pkg = require('./package.json');

export default {
  input: './src/index.js',
  output: [
    { format: 'cjs', file: pkg.main, exports: 'named' },
    { format: 'es', file: pkg.module },
  ],
  plugins: [
    babel(),
  ],
};
