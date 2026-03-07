import { motion } from 'framer-motion';
import { Castle, Crown, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GAME_LORE, GAME_NAME, GAME_SUBTITLE } from '@/data/theme';
import { useAuthStore } from '@/store/useAuthStore';

const highlights = [
  {
    title: 'Economia escalavel',
    text: 'Construa uma vila medieval-fantasia com custos exponenciais equilibrados e progresso consistente.',
    icon: Castle,
  },
  {
    title: 'Nova Era do Reino',
    text: 'Reinicie a run para ganhar Selos da Aurora e desbloquear bonus permanentes poderosos.',
    icon: Crown,
  },
  {
    title: 'Progresso em nuvem',
    text: 'Login com Supabase, sessao persistente e salvamento automatico para continuar de qualquer lugar.',
    icon: ShieldCheck,
  },
];

export function LandingPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="ornate-card relative overflow-hidden p-8 md:p-12"
        >
          <div className="absolute inset-0 bg-royal-gradient opacity-90" />

          <div className="relative z-10 grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Jogo Idle / Clicker</p>
              <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
                <span className="golden-text">{GAME_NAME}</span>
              </h1>
              <p className="mt-2 text-lg text-foreground/85">{GAME_SUBTITLE}</p>
              <p className="mt-5 max-w-2xl text-sm text-muted-foreground">{GAME_LORE}</p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg" className="min-w-[180px]">
                  <Link to={user ? '/app' : '/auth'}>{user ? 'Continuar Reino' : 'Comecar Agora'}</Link>
                </Button>

                <Button asChild variant="outline" size="lg">
                  <Link to="/auth">Login / Cadastro</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/40 bg-background/40 p-6 backdrop-blur">
              <p className="text-sm font-semibold text-primary">Mecanicas do MVP</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Clique manual + geracao passiva
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Upgrades, construcoes e conquistas
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Offline progress e autosave
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Sistema de rebirth com bonus permanentes
                </li>
              </ul>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 md:grid-cols-3">
          {highlights.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.07 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Icon className="h-5 w-5 text-primary" />
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
