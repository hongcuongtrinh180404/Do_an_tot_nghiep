import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { IApiResponse, IAuthTokens } from 'share-lib';

interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const API_BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach Access Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: unknown): Promise<never> => {
    return Promise.reject(error);
  },
);

// Response Interceptor: 401 Auto-Refresh with 30s Grace Period Support
let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<IApiResponse<unknown>>): Promise<unknown> => {
    const originalRequest = error.config as CustomRequestConfig | undefined;

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (typeof window === 'undefined') {
      return Promise.reject(error);
    }

    const currentRefreshToken = localStorage.getItem('refreshToken');
    if (!currentRefreshToken) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      return Promise.reject(error);
    }

    // Deduplicate concurrent refreshes across the same tab
    if (!refreshPromise) {
      refreshPromise = (async (): Promise<string | null> => {
        try {
          const res = await axios.post<IApiResponse<IAuthTokens>>(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken: currentRefreshToken },
            { headers: { 'Content-Type': 'application/json' } },
          );

          const tokens = res.data.data;
          if (tokens?.accessToken) {
            localStorage.setItem('accessToken', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
            return tokens.accessToken;
          }
          return null;
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          return null;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const newAccessToken = await refreshPromise;
    if (newAccessToken) {
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    }

    return Promise.reject(error);
  },
);
