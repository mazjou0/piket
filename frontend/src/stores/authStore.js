import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (username, password) => {
        const res = await api.post('/auth/login', { username, password });
        const { accessToken, refreshToken, user } = res.data.data;
        // Pastikan roles[] selalu array dan include role utama
        const roles = [...new Set([user.role, ...(user.roles || [])])];
        set({ user: { ...user, roles }, accessToken, refreshToken, isAuthenticated: true });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        return { ...user, roles };
      },

      logout: async () => {
        try {
          const { refreshToken } = get();
          await api.post('/auth/logout', { refreshToken });
        } catch (_) {}
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');
        const res = await api.post('/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data.data;
        set({ accessToken, refreshToken: newRefresh });
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        return accessToken;
      },

      setUser: (user) => set({ user }),

      updateProfile: async (data) => {
        const res = await api.get('/auth/me');
        set({ user: res.data.data });
      },
    }),
    {
      name: 'sipakar-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
