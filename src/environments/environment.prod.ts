export const environment = {
  production: true,
  apiUrl: (window as any).__env?.API_URL || 'http://localhost:8000',
  mediaServerUrl: (window as any).__env?.MEDIA_SERVER_URL || 'http://localhost:8889',
  hlsServerUrl: (window as any).__env?.HLS_SERVER_URL || 'http://localhost:8888'
};
