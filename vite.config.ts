import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { globSync } from 'glob';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const testFiles = globSync('./k6/simulations/**/*.test.ts');

const entries = testFiles.reduce(
  (acc, file) => {
    const normalizedFile = file.replaceAll('\\', '/');
    const match = normalizedFile.match(/^\.?\/?k6\/simulations\/(.+)\.ts$/);

    if (match) {
      acc[`tests/${match[1]}`] = resolve(
        projectRoot,
        normalizedFile.replace(/^\.\//, '')
      );
    }

    return acc;
  },
  {} as Record<string, string>
);

export default defineConfig({
  build: {
    lib: {
      entry: entries,
      formats: ['cjs'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      onwarn: (warning, warn) => {
        if (warning.code === 'MIXED_EXPORTS') {
          return;
        }

        warn(warning);
      },
      external: (id) =>
        id === 'k6' ||
        id === 'k6/browser' ||
        id === 'k6/metrics' ||
        id.startsWith('k6/'),
      output: {
        format: 'cjs',
        entryFileNames: '[name].js',
      },
      preserveEntrySignatures: 'exports-only',
    },
  },
  resolve: {
    alias: {
      '@lib': resolve(projectRoot, 'lib'),
      '@config': resolve(projectRoot, 'lib/config/runtime-config.ts'),
      '@pages': resolve(projectRoot, 'lib/pages'),
      '@src-pages': resolve(projectRoot, 'src/pages'),
      '@k6': resolve(projectRoot, 'k6'),
    },
  },
  plugins: [
    nodePolyfills({
      include: ['buffer', 'process', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
});
