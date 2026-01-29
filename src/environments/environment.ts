export const environment = {
  production: true,
  apiUrl: (window as any).__env?.API_URL || 'http://localhost:8000',
  mediaServerUrl: (window as any).__env?.MEDIA_SERVER_URL || 'http://localhost:8889',
  hlsServerUrl: (window as any).__env?.HLS_SERVER_URL || 'http://localhost:8888',
  // BM-APP Edge Device - default to actual server
  bmappUrl: (window as any).__env?.BMAPP_URL || 'http://103.75.84.183:2323'
};
