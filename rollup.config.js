import fs from 'fs'
import ts from 'rollup-plugin-ts'

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
      },
    ],
    plugins: [ts({ tsconfig: './tsconfig.json' })],
  },

  ...fs
    .readdirSync('src/encoder')
    .filter(fileName => fileName.endsWith('.ts'))
    .map(fileName => fileName.replace(/\.ts$/, ''))
    .map(fileName => {
      return {
        input: 'src/encoder/' + fileName + '.ts',
        output: [
          {
            file: 'dist/encoder/' + fileName + '.js',
            format: 'cjs',
          },
        ],
        plugins: [ts({ tsconfig: './tsconfig.json' })],
      }
    }),
]
