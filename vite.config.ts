import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const PRODUCTION_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'none'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

function productionCspPlugin(): Plugin {
  return {
    name: 'clyro-production-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<!-- CLYRO_CSP_META -->',
        `<meta http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP}" />`
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), productionCspPlugin()],
  worker: {
    format: 'es',
  },
  build: {
    sourcemap: false,
    target: 'es2022',
  },
});
