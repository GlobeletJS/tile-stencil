import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import pkg from "../package.json";

export default {
  input: 'src/index.js',
  plugins: [
    resolve(),
    commonjs(),
  ],
  output: {
    file: pkg.main,
    format: 'esm',
    name: pkg.name,
  }
};
