import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/80 focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
