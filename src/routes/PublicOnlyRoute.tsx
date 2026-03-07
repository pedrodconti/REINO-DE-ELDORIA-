import { Navigate, Outlet } from 'react-router-dom';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuthStore } from '@/store/useAuthStore';

export function PublicOnlyRoute() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);

  if (!isInitialized || isLoading) {
    return <LoadingScreen message="Preparando autenticacao..." />;
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
