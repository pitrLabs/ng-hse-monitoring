export const environment = {
  production: true,
  apiUrl: (window as any).__env?.API_URL || 'http://localhost:8000'
};
