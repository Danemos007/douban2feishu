import axios, { type AxiosResponse, type AxiosError } from "axios";
import { useAuthStore } from "@/store";

// Create axios instance with default config
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
  },
  // User config
  config: {
    get: "/config",
    douban: "/config/douban",
    feishu: "/config/feishu",
    sync: "/config/sync",
  },
  // Sync operations
  sync: {
    trigger: "/sync/trigger",
    status: (taskId: string) => `/sync/status/${taskId}`,
    history: "/sync/history",
    cancel: (taskId: string) => `/sync/cancel/${taskId}`,
  },
} as const;

// Common API response types
export interface APIError {
  message: string;
  code?: string;
  details?: unknown;
}

// API client helper functions
export const apiClient = {
  get: <T>(url: string) => api.get<T>(url),
  post: <T>(url: string, data?: unknown) => api.post<T>(url, data),
  put: <T>(url: string, data?: unknown) => api.put<T>(url, data),
  delete: <T>(url: string) => api.delete<T>(url),
  patch: <T>(url: string, data?: unknown) => api.patch<T>(url, data),
};

export default api;