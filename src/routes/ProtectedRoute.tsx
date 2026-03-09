import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuthStore } from '@/store/useAuthStore';

export function ProtectedRoute() {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isLoading = useAuthStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const recoverSession = useAuthStore((state) => state.recoverSession);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (!isInitialized || isLoading || user || isRecovering) {
      return;
    }

    let cancelled = false;

    const runRecovery = async () => {
      setIsRecovering(true);
      await recoverSession();

      if (!cancelled) {
        setIsRecovering(false);
      }
    };

    void runRecovery();

    return () => {
      cancelled = true;
    };
  }, [isInitialized, isLoading, isRecovering, recoverSession, user]);

  if (!isInitialized || isLoading || isRecovering) {
    return <LoadingScreen message="Carregando sessao..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}
