// Core application types for D2F project

export interface User {
  id: string;
  email: string;
  createdAt: string;
  lastSyncAt?: string;
}

export interface UserCredentials {
  userId: string;
  doubanCookie?: string;
  feishuAppId?: string;
  feishuAppSecret?: string;
  updatedAt: string;
}

export type SyncStatus = "idle" | "pending" | "running" | "success" | "failed";
export type TriggerType = "manual" | "auto";
export type MappingType = "3tables" | "4tables";

export interface SyncConfig {
  userId: string;
  mappingType: MappingType;
  autoSyncEnabled: boolean;
  syncSchedule?: {
    frequency: "daily" | "weekly" | "monthly";
    time: string;
  };
  tableMappings: {
    books?: string;
    movies?: string;
    tv?: string;
    music?: string;
  };
}

export interface SyncTask {
  id: string;
  userId: string;
  triggerType: TriggerType;
  status: SyncStatus;
  startedAt: string;
  completedAt?: string;
  itemsSynced?: number;
  errorMessage?: string;
  progress?: {
    current: number;
    total: number;
    phase: "fetching" | "processing" | "syncing";
  };
}

export interface DoubanItem {
  id: string;
  title: string;
  rating?: number;
  dateWatched?: string;
  dateRead?: string;
  comment?: string;
  tags?: string[];
  status: "watched" | "reading" | "want" | "done";
  type: "book" | "movie" | "tv" | "music";
  url: string;
  cover?: string;
  year?: number;
  author?: string;
  director?: string;
  cast?: string[];
  genres?: string[];
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// UI State types
export interface UIState {
  isWizardMode: boolean;
  currentStep: number;
  sidebarCollapsed: boolean;
  theme: "light" | "dark" | "system";
}

// Form types
export interface DoubanConfigForm {
  cookie: string;
}

export interface FeishuConfigForm {
  appId: string;
  appSecret: string;
}

export interface SyncConfigForm {
  mappingType: MappingType;
  autoSyncEnabled: boolean;
  syncSchedule?: {
    frequency: "daily" | "weekly" | "monthly";
    time: string;
  };
}