import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Hardcoded for debugging
  const bacnetProxyTarget = 'http://127.0.0.1:8000';
  const distechProxyTarget = env.VITE_PROXY_DISTECH_TARGET || env.VITE_MCP_DISTECH_URL || 'http://127.0.0.1:8001';
  const mqttProxyTarget = env.VITE_PROXY_MQTT_TARGET || env.VITE_MCP_MQTT_URL || 'http://127.0.0.1:8002';

  console.log('BACnet Proxy Target:', bacnetProxyTarget);

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/proxy/bacnet': {
          target: bacnetProxyTarget,
          changeOrigin: true,
          secure: false,
          ws: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
          rewrite: (path) => path.replace(/^\/proxy\/bacnet/, ''),
        },
        '/proxy/distech': {
          target: distechProxyTarget,
          changeOrigin: true,
          secure: false,
          ws: false,
          rewrite: (path) => path.replace(/^\/proxy\/distech/, ''),
        },
        '/proxy/mqtt': {
          target: mqttProxyTarget,
          changeOrigin: true,
          secure: false,
          ws: false,
          rewrite: (path) => path.replace(/^\/proxy\/mqtt/, ''),
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
