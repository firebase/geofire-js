import commonjs from 'rollup-plugin-commonjs';
import resolveModule from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import { uglify } from 'rollup-plugin-uglify';
import pkg from './package.json';

const GLOBAL_NAME = 'geofire';

const plugins = [
  resolveModule(),
  typescript({
    typescript: require('typescript')
  }),
  commonjs()
];

const external = Object.keys(pkg.dependencies || {});

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
    plugins,
    external
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/geofire.js',
      format: 'umd',
      name: GLOBAL_NAME
    },
    plugins: [...plugins, uglify()]
  },
];

export default [...completeBuilds];