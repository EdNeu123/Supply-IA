import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useAuthStore } from '@/store/authStore';
import { AppRoutes } from '@/app/routes';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export const App = () => {
  const { setAuth, setLoading } = useAuthStore();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) { const token = await user.getIdToken(); setAuth(user, token); }
      else setAuth(null, null);
      setLoading(false);
    });
    return () => unsub();
  }, [setAuth, setLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
};
