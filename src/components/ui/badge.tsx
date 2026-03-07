import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

function Badge({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border/70 bg-muted/70 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
