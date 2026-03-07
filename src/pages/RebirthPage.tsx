import { Crown, RotateCcw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { RebirthUpgradePanel } from '@/components/RebirthUpgradePanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { REBIRTH_ACTION_NAME, REBIRTH_CURRENCY_NAME } from '@/data/theme';
import { useGameStore } from '@/store/useGameStore';
import { formatLargeNumber } from '@/utils/format';

export function RebirthPage() {
  const progress = useGameStore((state) => state.progress);
  const performRebirth = useGameStore((state) => state.performRebirth);
  const previewRebirthReward = useGameStore((state) => state.previewRebirthReward);

  const rewardPreview = previewRebirthReward();

  const handleRebirth = () => {
    const confirmed = window.confirm(
      'Iniciar uma Nova Era? Isso reseta recursos, construcoes e upgrades da run atual em troca de Selos da Aurora.',
    );

    if (!confirmed) {
      return;
    }

    const result = performRebirth();

    if (result.ok) {
      toast.success('Nova Era iniciada', {
        description: result.message,
      });
      return;
    }

    toast.error('Nao foi possivel iniciar Nova Era', {
      description: result.message,
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <RotateCcw className="h-5 w-5 text-primary" />
            {REBIRTH_ACTION_NAME}
          </CardTitle>
          <CardDescription>
            Resete parte da progressao para receber {REBIRTH_CURRENCY_NAME} e evoluir permanentemente.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-4">
            <p className="text-sm text-muted-foreground">Recompensa prevista</p>
            <p className="mt-1 text-3xl font-bold text-primary">
              {formatLargeNumber(rewardPreview)} {REBIRTH_CURRENCY_NAME}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/35 p-3">
              <p className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                <Crown className="h-4 w-4 text-primary" />
                O que reseta
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>Recursos atuais</li>
                <li>Construcoes da run</li>
                <li>Upgrades de clique/passivo/globais</li>
                <li>Ganho atual da run</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/35 p-3">
              <p className="mb-2 flex items-center gap-2 font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-accent-foreground" />
                O que permanece
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>{REBIRTH_CURRENCY_NAME}</li>
                <li>Bonus permanentes comprados</li>
                <li>Conquistas e estatisticas globais</li>
                <li>Contagem de novas eras</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-background/35 p-4 text-sm text-muted-foreground">
            <p>
              Run atual: {formatLargeNumber(progress.stats.currentRunEarned)} recursos coletados nesta era.
            </p>
            <p className="mt-1">
              Novas Eras concluidas: {progress.rebirthCount.toLocaleString('pt-BR')}.
            </p>
          </div>

          <Button className="w-full" size="lg" onClick={handleRebirth} disabled={rewardPreview <= 0}>
            Iniciar {REBIRTH_ACTION_NAME}
          </Button>
        </CardContent>
      </Card>

      <RebirthUpgradePanel />
    </div>
  );
}
