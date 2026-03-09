import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { LoadingScreen } from '@/components/LoadingScreen';
import { hasCompleteUsername } from '@/services/profileService';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';

export function UsernameRequiredRoute() {
  const user = useAuthStore((state) => state.user);
  const profile = useProfileStore((state) => state.profile);
  const isLoading = useProfileStore((state) => state.isLoading);
  const loadedUserId = useProfileStore((state) => state.loadedUserId);
  const ensureLoaded = useProfileStore((state) => state.ensureLoaded);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (loadedUserId !== user.id) {
      void ensureLoaded(user.id, true);
    }
  }, [ensureLoaded, loadedUserId, user]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading || loadedUserId !== user.id) {
    return <LoadingScreen message="Verificando perfil do reino..." />;
  }

  if (!hasCompleteUsername(profile?.username)) {
    return <Navigate to="/complete-profile" replace />;
  }

  return <Outlet />;
}
