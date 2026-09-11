import { create } from 'zustand';
import { loginApi, getMeApi, logoutApi } from '../services/auth.service.js';

/**
 * Zustand authentication store.
 * The persistent source of truth is the server-side HTTP-only cookie.
 * No JWT tokens are ever stored in localStorage or sessionStorage.
 */
export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  /**
   * Bootstrap auth status on app start by calling GET /api/auth/me.
   */
  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await getMeApi();
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  /**
   * Log in user with credentials.
   * @param {object} credentials - { email, password }
   */
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const res = await loginApi(credentials);
      set({
        user: res.data.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed';
      set({ error: message, isLoading: false });
      return { success: false, error: message };
    }
  },

  /**
   * Log out user and clear cookie on backend.
   */
  logout: async () => {
    set({ isLoading: true });
    try {
      await logoutApi();
    } catch {
      // Clear state even if network call failed
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  /**
   * Clear error state.
   */
  clearError: () => set({ error: null }),
}));
