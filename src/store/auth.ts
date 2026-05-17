import { create } from 'zustand'

interface UserInfo {
  id: string
  email: string | null
  phone: string | null
  nickname: string | null
  created_at: string | null
}

interface AuthState {
  user: UserInfo | null
  loading: boolean
  token: string | null
  setUser: (user: UserInfo | null) => void
  setLoading: (loading: boolean) => void
  setToken: (token: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  token: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setToken: (token) => set({ token }),
}))

// 获取当前 token（同步访问 zustand store）
export const getAuthToken = () => useAuthStore.getState().token

// 获取当前用户
export const getAuthUser = () => useAuthStore.getState().user
