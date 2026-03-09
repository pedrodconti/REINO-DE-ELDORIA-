import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GAME_NAME } from '@/data/theme';
import { hasCompleteUsername, sanitizeUsername } from '@/services/profileService';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';

function mapProfileError(message: string): string {
  if (message.toLowerCase().includes('duplicate key')) {
    return 'Esse username ja esta em uso. Tente outro.';
  }

  return message;
}

export function CompleteProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const profile = useProfileStore((state) => state.profile);
  const loadedUserId = useProfileStore((state) => state.loadedUserId);
  const isLoading = useProfileStore((state) => state.isLoading);
  const ensureLoaded = useProfileStore((state) => state.ensureLoaded);
  const saveUsername = useProfileStore((state) => state.saveUsername);

  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (loadedUserId !== user.id) {
      void ensureLoaded(user.id, true);
      return;
    }

  }, [ensureLoaded, loadedUserId, user]);

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading || loadedUserId !== user.id) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Carregando perfil...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (hasCompleteUsername(profile?.username)) {
    return <Navigate to="/app" replace />;
  }

  const usernameValue = usernameDraft ?? profile?.username ?? '';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await saveUsername(user.id, usernameValue);

    if (!result.ok) {
      toast.error('Nao foi possivel salvar username', {
        description: mapProfileError(result.message),
      });
      setIsSubmitting(false);
      return;
    }

    toast.success('Username definido com sucesso!');
    navigate('/app', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl golden-text">{GAME_NAME}</CardTitle>
          <CardDescription>
            Antes de continuar, escolha seu username unico para ranking e trade.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={usernameValue}
                onChange={(event) => setUsernameDraft(event.target.value)}
                placeholder="ex.: eldoria_hero"
                maxLength={20}
                autoComplete="off"
                required
              />
              <p className="text-xs text-muted-foreground">
                Preview: <strong>{sanitizeUsername(usernameValue) || '...'}</strong>
              </p>
            </div>

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Confirmar username'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
