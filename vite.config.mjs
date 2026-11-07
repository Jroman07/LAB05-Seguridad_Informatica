import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('./client', import.meta.url)),
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    proxy: {
      '/socket.io': {target: 'http://127.0.0.1:3000', ws: true},
      '/media': {target: 'http://127.0.0.1:3000'}
    }
  },
  build: {outDir: '../dist/client', emptyOutDir: true}
});
