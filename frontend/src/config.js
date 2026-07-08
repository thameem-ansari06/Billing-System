const DEFAULT_API_URL = 'https://billing-system-jk1c.onrender.com';

const trimTrailingSlashes = (value) => value.replace(/\/+$/, '');

const configuredApiUrl = trimTrailingSlashes(
  import.meta.env.VITE_API_URL || DEFAULT_API_URL
);

export const BASE_URL = configuredApiUrl.endsWith('/api')
  ? configuredApiUrl.slice(0, -4)
  : configuredApiUrl;

export const API = configuredApiUrl.endsWith('/api')
  ? configuredApiUrl
  : `${configuredApiUrl}/api`;

export const buildApiUrl = (endpoint = '') => {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const apiPath = path === '/api'
    ? ''
    : path.startsWith('/api/')
      ? path.slice(4)
      : path;

  return `${API}${apiPath}`;
};

export const WS_API = API.replace(/^http/i, 'ws');
