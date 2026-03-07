# Reino de Eldoria - Cronicas da Aurora Arcana

MVP completo de jogo web idle/clicker medieval-fantasia com identidade propria, interface em PT-BR, autenticacao, salvamento em nuvem com Supabase, rebirth, conquistas, offline progress e arquitetura pronta para evolucao.

## Conceito rapido
Voce comeca como um campones coletando **Fragmentos de Eter** manualmente.
Com o tempo, expande sua vila, compra construcoes, desbloqueia upgrades, acelera a economia e inicia **Novas Eras do Reino** para ganhar **Selos da Aurora** (moeda de prestigo permanente).

## Stack usada
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Zustand
- Supabase
- React Router
- Framer Motion
- lucide-react

## Recursos implementados
- Cadastro e login com email/senha
- Sessao persistente
- Rotas protegidas (usuario nao autenticado redireciona para login)
- Salvamento automatico em nuvem
- Autosave a cada 15 segundos e ao trocar/fechar aba
- Carregamento do save por usuario com RLS
- Clique manual com numero flutuante
- Producao passiva por segundo
- Construcoes + upgrades
- Conquistas com desbloqueio automatico e toast
- Rebirth/Nova Era com bonus permanentes
- Offline progress ao voltar para o jogo
- Painel de estatisticas
- Painel de configuracoes

## Estrutura de pastas
```txt
src/
  components/
    ui/
  data/
  hooks/
  layouts/
  lib/
  pages/
  routes/
  services/
  store/
  types/
  utils/
supabase/
  schema.sql
```

## Como rodar localmente
### 1) Instalar dependencias
```bash
npm install
```

### 2) Criar `.env`
Crie um arquivo `.env` na raiz (copiando de `.env.example`):

```bash
cp .env.example .env
```

Se estiver no PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3) Preencher variaveis de ambiente
No arquivo `.env`, preencha:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

No codigo, o app usa:
- `import.meta.env.VITE_SUPABASE_URL`
- `import.meta.env.VITE_SUPABASE_ANON_KEY`

### 4) Rodar em desenvolvimento
```bash
npm run dev
```

Acesse:
- `http://localhost:5173`

## Configurando Supabase (passo a passo)
### 1) Criar projeto
1. Acesse [Supabase](https://supabase.com/)
2. Clique em **New project**
3. Escolha organizacao, nome, senha do banco e regiao
4. Aguarde provisionamento

### 2) Obter URL e Anon Key
No painel do projeto:
1. **Project Settings**
2. **API**
3. Copie:
- **Project URL** -> `VITE_SUPABASE_URL`
- **Project API keys > anon public** -> `VITE_SUPABASE_ANON_KEY`

### 3) Executar SQL do projeto
1. Abra **SQL Editor** no Supabase
2. Copie o conteudo de [`supabase/schema.sql`](/C:/Users/PICHAU/Desktop/JOGUINHO CLICKER/supabase/schema.sql)
3. Execute

Isso cria:
- tabelas `profiles`, `game_saves`, `rebirth_upgrades`, `optional_leaderboard`
- indices
- triggers (`updated_at` + profile automatico)
- RLS policies seguras por usuario

### 4) Configurar Auth Redirect URLs
No Supabase:
1. **Authentication** -> **URL Configuration**
2. Configure:
- **Site URL**: URL de producao do Cloudflare Pages
- **Redirect URLs**:
  - `http://localhost:5173`
  - `https://SEU-PROJETO.pages.dev`
  - (opcional) dominio customizado de producao

## Comandos uteis
```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Deploy gratis com Cloudflare Pages
### 1) Subir codigo no GitHub
1. Crie repositorio no GitHub
2. Commit e push do projeto

### 2) Criar projeto no Cloudflare Pages
1. Acesse [Cloudflare Pages](https://pages.cloudflare.com/)
2. Clique em **Create a project**
3. Conecte com GitHub
4. Selecione o repositorio

### 3) Configurar build
Use:
- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`

### 4) Configurar variaveis de ambiente no Cloudflare
No projeto Pages -> **Settings** -> **Environment variables**:
- `VITE_SUPABASE_URL` = sua Project URL
- `VITE_SUPABASE_ANON_KEY` = sua anon public key

Adicione em:
- Preview
- Production

### 5) Fazer deploy
1. Salve as configuracoes
2. Clique em **Deploy**
3. Ao finalizar, voce recebe uma URL: `https://SEU-PROJETO.pages.dev`

### 6) Voltar no Supabase e ajustar Auth
Em **Authentication -> URL Configuration**:
- Atualize **Site URL** para a URL do Pages
- Garanta `http://localhost:5173` e URL de producao em **Redirect URLs**

## Modelagem de dados salva
Cada usuario salva no banco:
- recurso atual
- recurso total acumulado
- producao por segundo
- forca de clique
- upgrades comprados
- construcoes compradas
- conquistas
- rebirth count
- moeda de rebirth
- multiplicadores permanentes (em `stats`)
- timestamp do ultimo save

## Regras de economia implementadas
- Custo de construcao: `base * (1.15 ^ quantidade)`
- Numeros grandes com sufixos (`K`, `M`, `B`, `T`, `Qa`, `Qi`, ...)
- Rebirth com recompensa baseada no ganho da run
- Offline gain com limite de seguranca (cap de 8h)

## Arquivos principais para estudo
- Cliente Supabase: [`src/lib/supabase.ts`](/C:/Users/PICHAU/Desktop/JOGUINHO CLICKER/src/lib/supabase.ts)
- Auth service: [`src/services/authService.ts`](/C:/Users/PICHAU/Desktop/JOGUINHO CLICKER/src/services/authService.ts)
- Save service: [`src/services/gameSaveService.ts`](/C:/Users/PICHAU/Desktop/JOGUINHO CLICKER/src/services/gameSaveService.ts)
- Store de auth: [`src/store/useAuthStore.ts`](/C:/Users/PICHAU/Desktop/JOGUINHO CLICKER/src/store/useAuthStore.ts)
- Store de jogo: [`src/store/useGameStore.ts`](/C:/Users/PICHAU/Desktop/JOGUINHO CLICKER/src/store/useGameStore.ts)
- Formulas: [`src/utils/gameMath.ts`](/C:/Users/PICHAU/Desktop/JOGUINHO CLICKER/src/utils/gameMath.ts)
- Dados de jogo:
  - [`src/data/buildings.ts`](/C:/Users/PICHAU/Desktop/JOGUINHO CLICKER/src/data/buildings.ts)
  - [`src/data/upgrades.ts`](/C:/Users/PICHAU/Desktop/JOGUINHO CLICKER/src/data/upgrades.ts)
  - [`src/data/achievements.ts`](/C:/Users/PICHAU/Desktop/JOGUINHO CLICKER/src/data/achievements.ts)
- Rotas protegidas:
  - [`src/routes/ProtectedRoute.tsx`](/C:/Users/PICHAU/Desktop/JOGUINHO CLICKER/src/routes/ProtectedRoute.tsx)

## Roadmap sugerido
1. Balanceamento avancado de economia (bulk buy, soft caps, eventos)
2. Sistema de quests diarias/semanai
3. Leaderboard global real com atualizacao automatica
4. Audio tematico e pacotes visuais adicionais
5. Mais linhas de rebirth e arvore de talentos permanente
6. Testes unitarios para formulas e stores

## Observacoes de seguranca
- Nenhuma chave real foi hardcoded no codigo.
- Todo acesso Supabase usa variaveis de ambiente.
- RLS esta habilitado para garantir isolamento por usuario.
