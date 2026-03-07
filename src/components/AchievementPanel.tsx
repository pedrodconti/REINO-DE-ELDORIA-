import { Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ACHIEVEMENTS } from '@/data/achievements';
import { useGameStore } from '@/store/useGameStore';

export function AchievementPanel() {
  const unlocked = useGameStore((state) => state.progress.achievements);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-primary" />
          Conquistas
        </CardTitle>
        <CardDescription>
          {unlocked.length.toLocaleString('pt-BR')} / {ACHIEVEMENTS.length.toLocaleString('pt-BR')} desbloqueadas
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-2 sm:grid-cols-2">
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlocked.includes(achievement.id);

          return (
            <div
              key={achievement.id}
              className={`rounded-lg border p-3 text-sm transition-all ${
                isUnlocked
                  ? 'border-primary/55 bg-primary/10 text-foreground'
                  : 'border-border/60 bg-muted/35 text-muted-foreground'
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-semibold">{achievement.name}</p>
                <Badge className={isUnlocked ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}>
                  {isUnlocked ? 'Feito' : 'Pendente'}
                </Badge>
              </div>
              <p className="text-xs">{achievement.description}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
