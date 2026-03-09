import { Box, Gauge, Hourglass, RotateCcw, Settings, Shield, Sparkles, Swords, Trophy, Vault } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { LoadingScreen } from '@/components/LoadingScreen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BOX_CURRENCY_NAME, GAME_NAME, RESOURCE_NAME } from '@/data/theme';
import { useAchievementToasts } from '@/hooks/useAchievementToasts';
import { useAutosave } from '@/hooks/useAutosave';
import { useGameBootstrap } from '@/hooks/useGameBootstrap';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useAuthStore } from '@/store/useAuthStore';
import { useGameStore } from '@/store/useGameStore';
import { useProfileStore } from '@/store/useProfileStore';
import { formatLargeNumber, formatPerSecond } from '@/utils/format';

const navLinks = [
  { to: '/app', label: 'Painel', icon: Gauge },
  { to: '/app/boxes', label: 'Caixas', icon: Box },
  { to: '/app/inventory', label: 'Inventario', icon: Vault },
  { to: '/app/ranking', label: 'Ranking', icon: Trophy },
  { to: '/app/trade', label: 'Trade', icon: Swords },
  { to: '/app/rebirth', label: 'Nova Era', icon: RotateCcw },
  { to: '/app/stats', label: 'Estatisticas', icon: Shield },
  { to: '/app/settings', label: 'Configuracoes', icon: Settings },
];

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const profile = useProfileStore((state) => state.profile);
  const progress = useGameStore((state) => state.progress);
  const isGameLoading = useGameStore((state) => state.isLoading);
  const isLoaded = useGameStore((state) => state.isLoaded);
  const loadedUserId = useGameStore((state) => state.loadedUserId);
  const saveForUser = useGameStore((state) => state.saveForUser);
  const isSaving = useGameStore((state) => state.isSaving);

  const navigate = useNavigate();

  useGameBootstrap();
  useGameLoop();
  useAutosave();
  useAchievementToasts();

  const shouldWaitForLoad = Boolean(user && (!isLoaded || loadedUserId !== user.id));
  const availableDiamonds = progress.crownDiamonds;

  if (shouldWaitForLoad || (!isLoaded && isGameLoading)) {
    return <LoadingScreen message="Carregando seu progresso na nuvem..." />;
  }

  const handleSaveNow = async () => {
    if (!user) {
      return;
    }

    const result = await saveForUser(user.id);

    if (result.ok) {
      toast.success('Salvo com sucesso', {
        description: 'Seu reino foi sincronizado com a nuvem.',
      });
      return;
    }

    toast.error('Falha ao salvar', {
      description: result.message,
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="ornate-card flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reino ativo</p>
            <h1 className="golden-text text-2xl">{GAME_NAME}</h1>
            <p className="text-xs text-muted-foreground">{profile?.username ?? user?.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Badge className="justify-center border-primary/45 bg-primary/10 px-3 py-1 text-primary sm:justify-start">
              <Sparkles className="mr-1 h-3 w-3" />
              {formatLargeNumber(progress.resourceAmount)} {RESOURCE_NAME}
            </Badge>

            <Badge className="justify-center border-accent/40 bg-accent/10 px-3 py-1 text-accent-foreground sm:justify-start">
              <Hourglass className="mr-1 h-3 w-3" />
              {formatPerSecond(progress.passiveIncome)}
            </Badge>

            <Badge className="justify-center border-emerald-500/45 bg-emerald-500/10 px-3 py-1 text-emerald-200 sm:justify-start">
              <Sparkles className="mr-1 h-3 w-3" />
              {formatLargeNumber(availableDiamonds)} {BOX_CURRENCY_NAME}
            </Badge>

            <Button variant="outline" onClick={handleSaveNow} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar agora'}
            </Button>

            <Button variant="ghost" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </header>

        <nav className="ornate-card p-2">
          <ul className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
            {navLinks.map((link) => {
              const Icon = link.icon;

              return (
                <li key={link.to} className="md:min-w-[150px]">
                  <NavLink
                    to={link.to}
                    end={link.to === '/app'}
                    className={({ isActive }) =>
                      `flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all md:justify-start ${
                        isActive
                          ? 'bg-primary/20 text-primary ring-1 ring-primary/50'
                          : 'bg-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
