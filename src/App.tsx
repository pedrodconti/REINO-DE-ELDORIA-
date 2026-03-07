import { useEffect, useMemo } from 'react';

import { LoadingScreen } from '@/components/LoadingScreen';
import { Toaster } from '@/components/ui/toaster';
import { ensureSupabaseEnv } from '@/lib/supabase';
import { AppRouter } from '@/routes/AppRouter';
import { useAuthStore } from '@/store/useAuthStore';

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const authError = useAuthStore((state) => state.error);

  const envError = useMemo(() => {
    try {
      ensureSupabaseEnv();
      return null;
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }

      return 'Erro de configuracao do Supabase.';
    }
  }, []);

  useEffect(() => {
    if (envError) {
      return;
    }

    void initialize();
  }, [envError, initialize]);

  if (envError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="ornate-card max-w-lg p-6 text-center">
          <h1 className="text-2xl font-bold text-destructive">Erro de configuracao</h1>
          <p className="mt-3 text-sm text-muted-foreground">{envError}</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return <LoadingScreen message="Acordando os portoes do reino..." />;
  }

  return (
    <>
      <AppRouter />
      <Toaster />
      {authError ? (
        <div className="fixed bottom-3 right-3 rounded-xl border border-destructive/55 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {authError}
        </div>
      ) : null}
    </>
  );
}

export default App;
