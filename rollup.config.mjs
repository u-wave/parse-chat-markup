import fs from 'fs';
import typescript from 'rollup-plugin-typescript2';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

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
