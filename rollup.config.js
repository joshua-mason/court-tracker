import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/main.ts',
  output: {
    file: 'build/main.js',
    format: 'iife',
    name: 'GAS',
    footer: 'function checkCourtAvailability() { return GAS.checkCourtAvailability(); }'
  },
  plugins: [
    nodeResolve(),
    typescript({
      tsconfig: './tsconfig.json'
    })
  ]
};