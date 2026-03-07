import { Clock3, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatLargeNumber } from '@/utils/format';

interface OfflineRewardBannerProps {
  amount: number;
  onClose: () => void;
}

export function OfflineRewardBanner({ amount, onClose }: OfflineRewardBannerProps) {
  if (amount <= 0) {
    return null;
  }

  return (
    <div className="ornate-card mb-4 flex items-center justify-between gap-3 border-accent/60 bg-accent/10 p-4">
      <div className="flex items-center gap-3">
        <Clock3 className="h-5 w-5 text-accent-foreground" />
        <div>
          <p className="font-semibold text-accent-foreground">Progresso offline aplicado</p>
          <p className="text-sm text-muted-foreground">
            Voce recebeu {formatLargeNumber(amount)} recursos enquanto esteve fora.
          </p>
        </div>
      </div>

      <Button variant="ghost" size="icon" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
