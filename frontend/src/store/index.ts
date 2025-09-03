import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {
  User,
  SyncTask,
  SyncConfig,
  UIState,
  SyncStatus,
} from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

interface SyncState {
  currentTask: SyncTask | null;
  recentTasks: SyncTask[];
  config: SyncConfig | null;
  status: SyncStatus;
  setCurrentTask: (task: SyncTask | null) => void;
  addRecentTask: (task: SyncTask) => void;
  updateTaskProgress: (
    taskId: string,
    updates: Partial<SyncTask>
  ) => void;
  setConfig: (config: SyncConfig) => void;
  setStatus: (status: SyncStatus) => void;
}

interface UIStore extends UIState {
  setWizardMode: (enabled: boolean) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  toggleSidebar: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

// Auth Store
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        token: null,
        login: (user, token) =>
          set({ user, token, isAuthenticated: true }, false, "auth/login"),
        logout: () =>
          set(
            { user: null, token: null, isAuthenticated: false },
            false,
            "auth/logout"
          ),
        updateUser: (updates) =>
          set(
            (state) => ({
              user: state.user ? { ...state.user, ...updates } : null,
            }),
            false,
            "auth/updateUser"
          ),
      }),
      {
        name: "d2f-auth",
        partialize: (state) => ({
          token: state.token,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: "AuthStore" }
  )
);

// Sync Store
export const useSyncStore = create<SyncState>()(
  devtools(
    (set) => ({
      currentTask: null,
      recentTasks: [],
      config: null,
      status: "idle",
      setCurrentTask: (task) =>
        set({ currentTask: task }, false, "sync/setCurrentTask"),
      addRecentTask: (task) =>
        set(
          (state) => ({
            recentTasks: [task, ...state.recentTasks].slice(0, 10), // Keep only last 10 tasks
          }),
          false,
          "sync/addRecentTask"
        ),
      updateTaskProgress: (taskId, updates) =>
        set(
          (state) => ({
            currentTask:
              state.currentTask?.id === taskId
                ? { ...state.currentTask, ...updates }
                : state.currentTask,
            recentTasks: state.recentTasks.map((task) =>
              task.id === taskId ? { ...task, ...updates } : task
            ),
          }),
          false,
          "sync/updateTaskProgress"
        ),
      setConfig: (config) =>
        set({ config }, false, "sync/setConfig"),
      setStatus: (status) =>
        set({ status }, false, "sync/setStatus"),
    }),
    { name: "SyncStore" }
  )
);

// UI Store
export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        isWizardMode: false,
        currentStep: 0,
        sidebarCollapsed: false,
        theme: "system",
        setWizardMode: (enabled) =>
          set({ isWizardMode: enabled }, false, "ui/setWizardMode"),
        setCurrentStep: (step) =>
          set({ currentStep: step }, false, "ui/setCurrentStep"),
        nextStep: () =>
          set(
            (state) => ({ currentStep: state.currentStep + 1 }),
            false,
            "ui/nextStep"
          ),
        prevStep: () =>
          set(
            (state) => ({
              currentStep: Math.max(0, state.currentStep - 1),
            }),
            false,
            "ui/prevStep"
          ),
        toggleSidebar: () =>
          set(
            (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
            false,
            "ui/toggleSidebar"
          ),
        setTheme: (theme) =>
          set({ theme }, false, "ui/setTheme"),
      }),
      {
        name: "d2f-ui",
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
        }),
      }
    ),
    { name: "UIStore" }
  )
);

// Computed values and selectors
export const useAuth = () => {
  const { user, isAuthenticated, token } = useAuthStore();
  return { user, isAuthenticated, token };
};

export const useSyncProgress = () => {
  const { currentTask } = useSyncStore();
  if (!currentTask?.progress) return null;
  
  const { current, total } = currentTask.progress;
  return {
    percentage: total > 0 ? Math.round((current / total) * 100) : 0,
    current,
    total,
    phase: currentTask.progress.phase,
  };
};