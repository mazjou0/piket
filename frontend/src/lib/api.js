import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const stored = localStorage.getItem('sipakar-auth');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — auto refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Jangan retry untuk request auth itu sendiri
    if (original.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }).catch(err => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const stored = localStorage.getItem('sipakar-auth');
        if (!stored) throw new Error('No auth state');

        const { state } = JSON.parse(stored);
        const refreshToken = state?.refreshToken;
        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data.data;

        // Update localStorage store
        const authState = JSON.parse(localStorage.getItem('sipakar-auth') || '{}');
        if (authState.state) {
          authState.state.accessToken = accessToken;
          authState.state.refreshToken = newRefresh;
          localStorage.setItem('sipakar-auth', JSON.stringify(authState));
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        processQueue(null, accessToken);

        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Bersihkan state dan redirect ke login
        localStorage.removeItem('sipakar-auth');
        delete api.defaults.headers.common['Authorization'];
        toast.error('Sesi berakhir, silakan login kembali');
        setTimeout(() => { window.location.href = '/login'; }, 1000);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Tampilkan error toast untuk status selain 401
    if (error.response?.status !== 401) {
      const message = error.response?.data?.message || 'Terjadi kesalahan';
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;
