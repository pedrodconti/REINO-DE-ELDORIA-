import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
}

export function StatCard({ title, value, detail, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
        </div>

        <div className="rounded-xl border border-primary/35 bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}
