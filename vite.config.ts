import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const bacnetProxyTarget = env.VITE_PROXY_BACNET_TARGET || env.VITE_MCP_BACNET_URL || 'http://localhost:8000';
    const distechProxyTarget = env.VITE_PROXY_DISTECH_TARGET || env.VITE_MCP_DISTECH_URL || 'http://localhost:8001';
    const mqttProxyTarget = env.VITE_PROXY_MQTT_TARGET || env.VITE_MCP_MQTT_URL || 'http://localhost:8002';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/proxy/bacnet': {
            target: bacnetProxyTarget,
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/proxy\/bacnet/, ''),
          },
          '/proxy/distech': {
            target: distechProxyTarget,
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/proxy\/distech/, ''),
          },
          '/proxy/mqtt': {
            target: mqttProxyTarget,
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/proxy\/mqtt/, ''),
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
