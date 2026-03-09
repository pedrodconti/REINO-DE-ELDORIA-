import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GAME_NAME } from '@/data/theme';
import { sanitizeUsername, validateUsername } from '@/services/profileService';
import { useAuthStore } from '@/store/useAuthStore';

export function AuthPage() {
  const navigate = useNavigate();

  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');

  const isLoginDisabled = useMemo(() => !loginEmail || !loginPassword || isLoading, [loginEmail, loginPassword, isLoading]);

  const isRegisterDisabled = useMemo(
    () => !registerEmail || !registerUsername || !registerPassword || !registerPasswordConfirm || isLoading,
    [isLoading, registerEmail, registerPassword, registerPasswordConfirm, registerUsername],
  );

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();

    const result = await signIn(loginEmail, loginPassword);

    if (!result.ok) {
      toast.error('Falha no login', {
        description: result.message,
      });
      return;
    }

    toast.success('Bem-vindo ao reino!');
    navigate('/app', { replace: true });
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();

    if (registerPassword !== registerPasswordConfirm) {
      toast.error('As senhas nao coincidem.');
      return;
    }

    if (registerPassword.length < 6) {
      toast.error('Use uma senha com pelo menos 6 caracteres.');
      return;
    }

    const usernameError = validateUsername(registerUsername);
    if (usernameError) {
      toast.error('Username invalido', {
        description: usernameError,
      });
      return;
    }

    const result = await signUp(registerEmail, registerPassword, registerUsername);

    if (!result.ok) {
      toast.error('Falha no cadastro', {
        description: result.message,
      });
      return;
    }

    toast.success('Conta criada', {
      description: result.message,
    });

    navigate('/app', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl golden-text">{GAME_NAME}</CardTitle>
          <CardDescription>Entre para salvar seu progresso e evoluir seu reino.</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Cadastro</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="voce@email.com"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="******"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoginDisabled}>
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form className="space-y-4" onSubmit={handleRegister}>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="voce@email.com"
                    value={registerEmail}
                    onChange={(event) => setRegisterEmail(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-username">Username</Label>
                  <Input
                    id="register-username"
                    type="text"
                    placeholder="ex.: eldoria_hero"
                    value={registerUsername}
                    onChange={(event) => setRegisterUsername(event.target.value)}
                    required
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nome publico: <strong>{sanitizeUsername(registerUsername) || '...'}</strong>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Senha</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerPassword}
                    onChange={(event) => setRegisterPassword(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password-confirm">Confirmar senha</Label>
                  <Input
                    id="register-password-confirm"
                    type="password"
                    value={registerPasswordConfirm}
                    onChange={(event) => setRegisterPasswordConfirm(event.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isRegisterDisabled}>
                  {isLoading ? 'Criando conta...' : 'Criar conta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {authError ? <p className="mt-4 text-sm text-destructive">{authError}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
