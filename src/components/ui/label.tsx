import type { LabelHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-sm font-semibold text-foreground', className)} {...props} />;
}

export { Label };
