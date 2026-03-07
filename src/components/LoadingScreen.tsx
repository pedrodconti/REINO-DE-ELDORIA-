import { Sparkles } from 'lucide-react';

import { GAME_NAME, GAME_SUBTITLE } from '@/data/theme';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Preparando seu reino...' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="ornate-card w-full max-w-md p-8 text-center">
        <Sparkles className="mx-auto mb-4 h-10 w-10 text-primary animate-pulse" />
        <h1 className="golden-text text-3xl">{GAME_NAME}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{GAME_SUBTITLE}</p>
        <p className="mt-6 text-sm text-foreground/90">{message}</p>
      </div>
    </div>
  );
}
