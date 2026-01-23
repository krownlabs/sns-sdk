import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import dts from 'rollup-plugin-dts';

const external = ['ethers'];

const plugins = [
  resolve({
    browser: true,
    preferBuiltins: false
  }),
  commonjs(),
  json(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationMap: false,
    noEmitOnError: false
  })
];

export default [
  // Main build
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      },
      {
        file: 'dist/index.esm.js',
        format: 'es',
        sourcemap: true
      }
    ],
    external,
    plugins,
    onwarn(warning, warn) {
      // Suppress certain warnings
      if (warning.code === 'CIRCULAR_DEPENDENCY') return;
      if (warning.code === 'THIS_IS_UNDEFINED') return;
      warn(warning);
    }
  },
  // Type definitions
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    external,
    plugins: [dts({
      respectExternal: true
    })],
    onwarn(warning, warn) {
      // Suppress type-related warnings during d.ts generation
      if (warning.code === 'UNRESOLVED_IMPORT') return;
      warn(warning);
    }
  }
];