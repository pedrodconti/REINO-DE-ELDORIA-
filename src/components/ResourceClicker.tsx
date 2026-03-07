import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { formatLargeNumber, formatPerSecond } from '@/utils/format';

interface FloatingValue {
  id: number;
  value: number;
  x: number;
  y: number;
}

interface ResourceClickerProps {
  resourceName: string;
  resourceAmount: number;
  clickPower: number;
  passiveIncome: number;
  onMainClick: () => number;
}

export function ResourceClicker({
  resourceName,
  resourceAmount,
  clickPower,
  passiveIncome,
  onMainClick,
}: ResourceClickerProps) {
  const [floating, setFloating] = useState<FloatingValue[]>([]);

  const buttonLabel = useMemo(() => `Coletar ${resourceName}`, [resourceName]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const gain = onMainClick();
    if (gain <= 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now() + Math.floor(Math.random() * 1000);

    setFloating((prev) => [...prev, { id, value: gain, x, y }]);
  };

  return (
    <div className="ornate-card relative overflow-hidden p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.22),transparent_50%)]" />

      <div className="relative z-10 flex flex-col items-center gap-5 text-center">
        <Badge className="border-primary/40 bg-primary/10 text-primary">Recurso Principal</Badge>

        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">{resourceName}</p>
        <h2 className="text-4xl font-bold leading-none golden-text md:text-5xl">
          {formatLargeNumber(resourceAmount)}
        </h2>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>{formatPerSecond(passiveIncome)}</span>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          onClick={handleClick}
          className="relative mt-2 h-48 w-48 rounded-full border border-primary/70 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.3),rgba(212,175,55,0.18)_35%,rgba(19,24,40,0.94)_82%)] text-lg font-semibold text-foreground shadow-[0_24px_45px_-22px_rgba(212,175,55,0.85)] transition-all md:h-56 md:w-56"
          aria-label={buttonLabel}
        >
          <span className="block text-xs uppercase tracking-[0.18em] text-primary/80">Clique para</span>
          <span className="mt-2 block text-2xl font-bold">Coletar</span>
          <span className="mt-3 block text-sm text-muted-foreground">
            +{formatLargeNumber(clickPower)} por clique
          </span>

          <AnimatePresence>
            {floating.map((item) => (
              <motion.span
                key={item.id}
                initial={{ opacity: 0.9, y: item.y, x: item.x, scale: 0.8 }}
                animate={{ opacity: 0, y: item.y - 70, x: item.x + 12, scale: 1.1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.85, ease: 'easeOut' }}
                onAnimationComplete={() => {
                  setFloating((prev) => prev.filter((entry) => entry.id !== item.id));
                }}
                className="pointer-events-none absolute text-sm font-bold text-primary"
              >
                +{formatLargeNumber(item.value)}
              </motion.span>
            ))}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
