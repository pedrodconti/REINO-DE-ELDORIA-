import { useEffect, useState } from 'react';
import { Save, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { hasCompleteUsername, sanitizeUsername } from '@/services/profileService';
import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';
import { useProfileStore } from '@/store/useProfileStore';

function normalizeProfileError(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = String(error.message);
    if (message.toLowerCase().includes('duplicate key')) {
      return 'Esse nome ja esta em uso por outro jogador.';
    }

    return message;
  }

  return 'Falha ao atualizar nome de jogador.';
}

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  const progress = useGameStore((state) => state.progress);
  const isSaving = useGameStore((state) => state.isSaving);
  const saveForUser = useGameStore((state) => state.saveForUser);
  const setSetting = useGameStore((state) => state.setSetting);
  const resetCurrentRun = useGameStore((state) => state.resetCurrentRun);
  const resetAllLocalProgress = useGameStore((state) => state.resetAllLocalProgress);
  const profile = useProfileStore((state) => state.profile);
  const profileLoadedUserId = useProfileStore((state) => state.loadedUserId);
  const isLoadingProfile = useProfileStore((state) => state.isLoading);
  const ensureProfileLoaded = useProfileStore((state) => state.ensureLoaded);
  const saveUsername = useProfileStore((state) => state.saveUsername);

  const [username, setUsername] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (profileLoadedUserId !== user.id) {
      void ensureProfileLoaded(user.id, true);
    }
  }, [ensureProfileLoaded, profileLoadedUserId, user]);

  useEffect(() => {
    if (profile?.username) {
      setUsername(profile.username);
    }
  }, [profile?.username]);

  const handleManualSave = async () => {
    if (!user) {
      return;
    }

    const result = await saveForUser(user.id);

    if (result.ok) {
      toast.success('Progresso salvo na nuvem.');
      return;
    }

    toast.error('Erro ao salvar', {
      description: result.message,
    });
  };

  const handleSaveUsername = async () => {
    if (!user) {
      return;
    }

    setIsSavingProfile(true);
    try {
      const result = await saveUsername(user.id, username);

      if (!result.ok) {
        toast.error('Falha ao atualizar nome', {
          description: normalizeProfileError(result.message),
        });
        return;
      }

      const normalized = sanitizeUsername(username);
      setUsername(normalized);

      toast.success('Nome atualizado', {
        description: 'Agora ranking e trade vao mostrar seu novo nome.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleResetRun = () => {
    const confirmed = window.confirm('Resetar run atual mantendo upgrades permanentes e moeda de rebirth?');
    if (!confirmed) {
      return;
    }

    resetCurrentRun();
    toast.success('Run atual resetada localmente. Salve para enviar para nuvem.');
  };

  const handleResetAll = () => {
    const confirmed = window.confirm('Resetar TODO o progresso local desta conta?');
    if (!confirmed) {
      return;
    }

    resetAllLocalProgress();
    toast.success('Estado local limpo. Salve para substituir o progresso na nuvem.');
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Perfil do reino</CardTitle>
          <CardDescription>Defina seu nome publico para ranking e trades.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="username">Nome de jogador</Label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              maxLength={20}
              placeholder="Ex.: Eldoriano_01"
              disabled={isLoadingProfile || isSavingProfile}
            />
            <p className="text-xs text-muted-foreground">
              Use 3 a 20 caracteres: letras minusculas, numeros e underscore.
            </p>
            {!hasCompleteUsername(profile?.username) ? (
              <p className="text-xs text-amber-300">Seu perfil ainda nao possui username valido.</p>
            ) : null}
          </div>

          <Button
            className="w-full"
            onClick={handleSaveUsername}
            disabled={isLoadingProfile || isSavingProfile || sanitizeUsername(username) === sanitizeUsername(profile?.username ?? '')}
          >
            <UserRound className="mr-2 h-4 w-4" />
            {isSavingProfile ? 'Salvando nome...' : 'Salvar nome de jogador'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferencias</CardTitle>
          <CardDescription>Ajustes basicos para experiencia e automacao.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/35 px-4 py-3">
            <div>
              <Label htmlFor="mute">Mutar sons</Label>
              <p className="text-xs text-muted-foreground">Preparado para quando efeitos sonoros forem adicionados.</p>
            </div>
            <Switch
              id="mute"
              checked={progress.settings.soundMuted}
              onCheckedChange={(value) => setSetting('soundMuted', value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/35 px-4 py-3">
            <div>
              <Label htmlFor="autosave">Autosave</Label>
              <p className="text-xs text-muted-foreground">Salva a cada 15 segundos e ao sair da aba.</p>
            </div>
            <Switch
              id="autosave"
              checked={progress.settings.autosaveEnabled}
              onCheckedChange={(value) => setSetting('autosaveEnabled', value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/35 px-4 py-3">
            <div>
              <Label htmlFor="reduce-motion">Reduzir animacoes</Label>
              <p className="text-xs text-muted-foreground">Opcao de conforto visual para jogadores sensiveis a movimento.</p>
            </div>
            <Switch
              id="reduce-motion"
              checked={progress.settings.reduceMotion}
              onCheckedChange={(value) => setSetting('reduceMotion', value)}
            />
          </div>

          <Button className="w-full" onClick={handleManualSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar progresso agora'}
          </Button>

          <p className="text-xs text-muted-foreground">
            Ultimo save: {progress.lastSaveAt ? new Date(progress.lastSaveAt).toLocaleString('pt-BR') : 'ainda nao salvo'}
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Gerenciamento de progresso</CardTitle>
          <CardDescription>Use com cuidado. Essas acoes alteram seu estado local atual.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full" onClick={handleResetRun}>
            <Trash2 className="mr-2 h-4 w-4" />
            Resetar run atual (mantem rebirth)
          </Button>

          <Button variant="destructive" className="w-full" onClick={handleResetAll}>
            <Trash2 className="mr-2 h-4 w-4" />
            Reset total local
          </Button>

          <p className="rounded-lg border border-border/70 bg-muted/35 p-3 text-xs text-muted-foreground">
            Dica: apos qualquer reset local, use "Salvar progresso agora" para sincronizar com o banco.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
