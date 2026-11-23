import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // عشان يفتح من رابط الـ Codespace
  server: { port: 5173, allowedHosts: ['.app.github.dev'] },
});
