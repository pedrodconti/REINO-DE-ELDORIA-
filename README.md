# Reino de Eldoria - Cronicas da Aurora Arcana

Jogo web idle/clicker medieval-fantasia em PT-BR, com login, save em nuvem e agora com sistemas de caixas, inventario de itens passivos, ranking e trade seguro entre jogadores.

## Stack
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

## O que existe no projeto
### Base do jogo
- Clique manual + producao passiva
- Construcoes + upgrades
- Rebirth (Nova Era)
- Offline progress
- Conquistas
- Autosave
- Login/cadastro com Supabase
- Save por usuario com RLS

### Sistemas novos
- Loja de caixas com rotacao temporal aleatoria
- Caixas com raridade, preco, pool de itens e tempo de disponibilidade
- Abertura de caixa no backend via RPC (`open_active_loot_box`)
- Inventario com filtros, ordenacao, equipar/desequipar e marcar item para trade
- Itens com bonus passivos integrados ao calculo do jogo
- Ranking por multiplas metricas (recurso, passivo, rebirth, caixas, inventario, item raro)
- Trade entre jogadores com validacao atomica no backend (sem duplicacao)

## Estrutura principal
```txt
src/
  components/
    boxes/
    inventory/
    ranking/
    trade/
    ui/
  data/
  hooks/
  layouts/
  lib/
  pages/
  routes/
  services/
    boxes/
    inventory/
    ranking/
    trade/
  store/
  types/
  utils/
supabase/
  schema.sql
```

## 1) Como rodar localmente
### Instalar dependencias
```bash
npm install
```

### Criar `.env`
```bash
cp .env.example .env
```
No PowerShell:
```powershell
Copy-Item .env.example .env
```

### Preencher variaveis
No arquivo `.env`:
```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Rodar o app
```bash
npm run dev
```
Acesse: `http://localhost:5173`

## 2) Como aplicar migrations no Supabase
1. Abra o projeto no Supabase.
2. Entre em **SQL Editor**.
3. Copie e execute todo o arquivo [`supabase/schema.sql`](./supabase/schema.sql).
4. Esse script e idempotente: pode ser reexecutado sem duplicar estrutura.

Ele cria/atualiza:
- tabelas base (`profiles`, `game_saves`, `rebirth_upgrades`)
- tabelas novas (`loot_boxes`, `loot_box_rotations`, `loot_box_runtime_state`, `item_definitions`, `loot_box_item_pool`, `user_items`, `box_open_history`, `leaderboard_cache`, `trades`, `trade_items`)
- indices
- RLS policies
- triggers
- RPCs seguras:
  - `refresh_loot_box_shop`
  - `open_active_loot_box`
  - `set_item_equipped`
  - `create_trade_offer`
  - `respond_trade`

## 3) Configurar Auth Redirect URLs no Supabase
No Supabase:
1. **Authentication** -> **URL Configuration**
2. Configure:
- **Site URL**: URL de producao do Cloudflare Pages
- **Redirect URLs**:
  - `http://localhost:5173`
  - `https://SEU-PROJETO.pages.dev`

## 4) Como testar os novos sistemas
### Caixas
1. Entre no jogo.
2. Abra aba **Caixas**.
3. Aguarde caixa ativa (se nao houver, espere o timer da proxima rotacao).
4. Abra caixa e valide:
- desconto de recurso no save
- item recebido no inventario
- historico de drop preenchido

### Inventario
1. Abra aba **Inventario**.
2. Teste filtros/ordenacao.
3. Equipe e desequipe itens.
4. Marque/desmarque itens para trade.

### Ranking
1. Abra aba **Ranking**.
2. Troque a metrica do ranking.
3. Confirme sua posicao e dados atualizados.

### Trade
1. Marque itens como negociaveis no inventario.
2. Abra aba **Trade**.
3. Busque jogador por username.
4. Envie proposta com itens.
5. No destinatario, aceite/recuse.
6. Valide transferencia de itens e travas de seguranca.

## 5) Deploy gratis (Cloudflare Pages)
### Subir repositorio
```bash
git add .
git commit -m "feat: update caixas ranking trade"
git push origin main
```

### Criar projeto no Cloudflare Pages
1. Cloudflare -> **Workers & Pages** -> **Create application**.
2. **Import an existing Git repository**.
3. Selecione o repositorio.

### Build settings
- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`

### Environment Variables no Cloudflare
Adicione em **Production** e **Preview**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Deploy
1. Salve configuracoes.
2. Rode o deploy.
3. Pegue a URL `https://SEU-PROJETO.pages.dev`.
4. Volte no Supabase e confirme esta URL no Auth (Site URL + Redirect URLs).

## 6) Segurança e integridade
- Nenhuma chave real fica hardcoded no codigo.
- RLS ativa em todas as tabelas sensiveis.
- Abertura de caixa e processamento de trade sao feitos no backend (RPC).
- Trade e atomica: se falhar, nao conclui parcialmente.
- Itens em trade ficam travados para evitar duplicacao/exploit.

## 7) Comandos uteis
```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## 8) Evolucoes sugeridas
1. Ranking semanal com snapshot historico.
2. Logs de auditoria de trade por Edge Function.
3. Sistema de slots visuais de equipamento no dashboard.
4. Eventos sazonais de caixas (calendario real).
5. Code split para reduzir bundle JS inicial.
