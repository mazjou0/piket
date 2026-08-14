import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { useThemeStore } from './stores/themeStore.js';
import './index.css';

/* ── QueryClient ── */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

/* ── Terapkan tema sebelum render (hindari flash of wrong theme) ── */
useThemeStore.getState().applyCurrentTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 3500,
          style: {
            background:   'var(--color-surface)',
            color:        'var(--color-foreground)',
            border:       '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            fontSize:     '0.875rem',
            padding:      '0.65rem 1rem',
            boxShadow:    '0 4px 16px rgba(0,0,0,0.12)',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
);
