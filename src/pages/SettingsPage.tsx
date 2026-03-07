import { Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  const progress = useGameStore((state) => state.progress);
  const isSaving = useGameStore((state) => state.isSaving);
  const saveForUser = useGameStore((state) => state.saveForUser);
  const setSetting = useGameStore((state) => state.setSetting);
  const resetCurrentRun = useGameStore((state) => state.resetCurrentRun);
  const resetAllLocalProgress = useGameStore((state) => state.resetAllLocalProgress);

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

      <Card>
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
