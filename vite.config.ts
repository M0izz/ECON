import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@econ/sdk': path.resolve(__dirname, './src/sdk/index.ts'),
      '@econ/settlement': path.resolve(__dirname, './src/settlement/index.ts'),
      '@econ/demo': path.resolve(__dirname, './src/demo/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
