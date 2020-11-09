import commonjs from 'rollup-plugin-commonjs';
import resolveModule from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import { uglify } from 'rollup-plugin-uglify';
import pkg from './package.json';

const GLOBAL_NAME = 'geofire-common';

const plugins = [
  resolveModule(),
  typescript({
    typescript: require('typescript')
  }),
  commonjs()
];

const completeBuilds = [{
    input: 'src/index.ts',
    output: [{
        file: pkg.main,
        format: 'cjs'
      },
      {
        file: pkg.module,
        format: 'es'
      }
    ],
    plugins
  },
  {
    input: 'src/index.ts',
    output: {
      file: pkg.browser,
      format: 'umd',
      name: GLOBAL_NAME
    },
    plugins: [...plugins, uglify()]
  },
  {
    input: 'src/index.ts',
    output: {
      file: pkg.index,
      format: 'umd',
      name: GLOBAL_NAME
    },
    plugins: [...plugins]
  }
];

export default [...completeBuilds];
