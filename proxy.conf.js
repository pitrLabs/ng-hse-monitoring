const PROXY_CONFIG = [
  {
    context: ['/bmapp-api'],
    target: 'http://103.75.84.183:2323',
    secure: false,
    changeOrigin: true,
    ws: true, // Enable WebSocket proxy for /video/ endpoint
    pathRewrite: {
      '^/bmapp-api': ''
    },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      console.log('[Proxy] Request:', req.method, req.url, '-> http://103.75.84.183:2323' + req.url.replace('/bmapp-api', ''));
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log('[Proxy] Response:', proxyRes.statusCode, req.url);
    },
    onError: (err, req, res) => {
      console.error('[Proxy] Error:', err.message);
    }
  },
  {
    context: ['/bmapp-zlm'],
    target: 'http://103.75.84.183:58000',
    secure: false,
    changeOrigin: true,
    pathRewrite: {
      '^/bmapp-zlm': ''
    },
    logLevel: 'debug'
  }
];

module.exports = PROXY_CONFIG;
