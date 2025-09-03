import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { apiClient, endpoints } from "@/lib/api";
import type {
  User,
  SyncTask,
  SyncConfig,
  DoubanConfigForm,
  FeishuConfigForm,
  SyncConfigForm,
  APIResponse,
  PaginatedResponse,
} from "@/types";

// Query keys for consistent cache management
export const queryKeys = {
  user: ["user"] as const,
  config: ["config"] as const,
  syncHistory: (page?: number) => ["sync", "history", page] as const,
  syncStatus: (taskId: string) => ["sync", "status", taskId] as const,
} as const;

// Auth hooks
export const useLogin = (
  options?: UseMutationOptions<
    APIResponse<{ user: User; token: string }>,
    Error,
    { email: string; password: string }
  >
) => {
  return useMutation({
    mutationFn: (credentials) =>
      apiClient.post<APIResponse<{ user: User; token: string }>>(
        endpoints.auth.login,
        credentials
      ).then(res => res.data),
    ...options,
  });
};

export const useRegister = (
  options?: UseMutationOptions<
    APIResponse<{ user: User; token: string }>,
    Error,
    { email: string; password: string }
  >
) => {
  return useMutation({
    mutationFn: (userData) =>
      apiClient.post<APIResponse<{ user: User; token: string }>>(
        endpoints.auth.register,
        userData
      ).then(res => res.data),
    ...options,
  });
};

// Config hooks
export const useGetConfig = (
  options?: UseQueryOptions<APIResponse<SyncConfig>, Error>
) => {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: () =>
      apiClient.get<APIResponse<SyncConfig>>(endpoints.config.get)
        .then(res => res.data),
    ...options,
  });
};

export const useUpdateDoubanConfig = (
  options?: UseMutationOptions<APIResponse, Error, DoubanConfigForm>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) =>
      apiClient.put<APIResponse>(endpoints.config.douban, data)
        .then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config });
    },
    ...options,
  });
};

export const useUpdateFeishuConfig = (
  options?: UseMutationOptions<APIResponse, Error, FeishuConfigForm>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) =>
      apiClient.put<APIResponse>(endpoints.config.feishu, data)
        .then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config });
    },
    ...options,
  });
};

export const useUpdateSyncConfig = (
  options?: UseMutationOptions<APIResponse, Error, SyncConfigForm>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) =>
      apiClient.put<APIResponse>(endpoints.config.sync, data)
        .then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config });
    },
    ...options,
  });
};

// Sync hooks
export const useTriggerSync = (
  options?: UseMutationOptions<APIResponse<{ taskId: string }>, Error, void>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () =>
      apiClient.post<APIResponse<{ taskId: string }>>(endpoints.sync.trigger)
        .then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync"] });
    },
    ...options,
  });
};

export const useSyncStatus = (
  taskId: string,
  options?: UseQueryOptions<APIResponse<SyncTask>, Error>
) => {
  return useQuery({
    queryKey: queryKeys.syncStatus(taskId),
    queryFn: () =>
      apiClient.get<APIResponse<SyncTask>>(endpoints.sync.status(taskId))
        .then(res => res.data),
    enabled: !!taskId,
    refetchInterval: (query) => {
      // Stop polling if task is completed
      if (query.state.data?.data?.status === "success" || query.state.data?.data?.status === "failed") {
        return false;
      }
      return 2000; // Poll every 2 seconds for running tasks
    },
    ...options,
  });
};

export const useSyncHistory = (
  page = 1,
  options?: UseQueryOptions<PaginatedResponse<SyncTask>, Error>
) => {
  return useQuery({
    queryKey: queryKeys.syncHistory(page),
    queryFn: () =>
      apiClient.get<PaginatedResponse<SyncTask>>(
        `${endpoints.sync.history}?page=${page}&limit=10`
      ).then(res => res.data),
    ...options,
  });
};

export const useCancelSync = (
  options?: UseMutationOptions<APIResponse, Error, string>
) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (taskId) =>
      apiClient.post<APIResponse>(endpoints.sync.cancel(taskId))
        .then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync"] });
    },
    ...options,
  });
};