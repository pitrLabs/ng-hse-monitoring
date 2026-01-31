export const environment = {
  production: true,
  apiUrl: (window as any).__env?.API_URL || 'http://localhost:8000',
  mediaServerUrl: (window as any).__env?.MEDIA_SERVER_URL || 'http://localhost:8889',
  hlsServerUrl: (window as any).__env?.HLS_SERVER_URL || 'http://localhost:8888',
  bmappUrl: (window as any).__env?.BMAPP_URL || 'http://localhost:10800',
  // BM-APP WebRTC (ZLMediaKit) - for video streaming
  bmappWebrtcUrl: (window as any).__env?.BMAPP_WEBRTC_URL || 'http://localhost:10800/webrtc'
};
