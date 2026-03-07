import { Navigate, Outlet } from 'react-router-dom';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuthStore } from '@/store/useAuthStore';

export function ProtectedRoute() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);

  if (!isInitialized || isLoading) {
    return <LoadingScreen message="Carregando sessao..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}
