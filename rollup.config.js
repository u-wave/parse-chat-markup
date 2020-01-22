import typescript from 'rollup-plugin-typescript2';

const pkg = require('./package.json');

export default {
  input: './src/index.ts',
  output: [
    { format: 'cjs', file: pkg.main, exports: 'named' },
    { format: 'es', file: pkg.module },
  ],
  plugins: [
    typescript(),
  ],
};
