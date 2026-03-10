# Reino de Eldoria - Cronicas da Aurora Arcana

Jogo web idle/clicker medieval-fantasia em PT-BR com login, save em nuvem, caixas rotativas, inventario/equipamento, ranking e trade.

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

## O que foi corrigido nesta versao
- Correcao da loja de caixas com fallback para schema legado.
- Username obrigatorio e unico (cadastro novo + bloqueio de usuarios antigos sem username).
- Troca de username com cooldown de 30 dias (enforced no backend).
- Conversao segura no backend: `1000 Selos da Aurora = 1 Diamante da Coroa`.
- Abertura de caixa com custo em diamantes, compra unica por rotacao e validacao backend.
- Rotacao de caixas com 1-2 caixas ativas por janela e troca a cada 3 horas.
- Inventario com secao `Itens Equipados` + botao `Equipar melhores`.

## Estrutura
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
  patch_2026_03_08_gameplay_update.sql
  patch_2026_03_09_diagnostic_fixes.sql
```

## 1) Rodar localmente
### Instalar dependencias
```bash
npm install
```

### Criar `.env`
```bash
cp .env.example .env
```
PowerShell:
```powershell
Copy-Item .env.example .env
```

### Preencher variaveis
No `.env`:
```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Subir app
```bash
npm run dev
```
Acesse: `http://localhost:5173`

## 2) SQL no Supabase (ordem obrigatoria)
Abra **Supabase -> SQL Editor** e rode nesta ordem:

1. `supabase/schema.sql` (base completa)
2. `supabase/patch_2026_03_09_diagnostic_fixes.sql` (correcoes obrigatorias desta versao)
3. `supabase/patch_2026_03_09_username_cooldown.sql` (cooldown de 30 dias para troca de username)

Observacoes:
- Se voce ja tinha aplicado o patch `2026_03_08`, ainda deve aplicar o `2026_03_09`.
- O patch novo ajusta username obrigatorio, diamantes persistidos, rotacao nova e RPCs de seguranca.

## 3) Auth Redirect URLs (Supabase)
No Supabase:
1. **Authentication -> URL Configuration**
2. Configure:
- **Site URL**: URL de producao no Cloudflare Pages
- **Redirect URLs**:
  - `http://localhost:5173`
  - `https://SEU-PROJETO.pages.dev`

## 4) Fluxo de migracao de usuarios antigos
Usuarios antigos que nao tinham username:
- serao bloqueados no app principal;
- serao redirecionados para `/complete-profile`;
- so entram no jogo apos salvar username valido.

No banco, o patch:
- saneia usernames antigos;
- garante formato `^[a-z0-9_]{3,20}$`;
- aplica unicidade;
- define `username` como obrigatorio.
- aplica cooldown de 30 dias entre trocas de username.

## 5) Teste rapido dos 3 bugs corrigidos
### Bug 1: Loja de caixas
1. Abra aba `Caixas`.
2. Confirme carregamento sem crash.
3. Se nao houver caixa ativa, deve aparecer estado vazio amigavel com timer.

### Bug 2: Username
1. Crie conta nova com username.
2. Login deve funcionar e ranking/trade devem exibir username.
3. Conta antiga sem username deve cair em `/complete-profile`.

### Bug 3: Conversao Selos -> Diamantes
1. Garanta saldo de Selos da Aurora.
2. Na aba `Caixas`, use painel de conversao.
3. Valide atualizacao imediata de Selos e Diamantes.

## 6) Testar caixas, inventario, ranking e trade
### Caixas
- Verifique 1-2 caixas ativas por janela.
- Verifique contador da rotacao atual e proxima janela.
- Abra uma caixa e tente abrir de novo na mesma rotacao (deve bloquear).

### Inventario
- Equipe item e veja atualizacao imediata sem trocar pagina.
- Valide regra de 1 item equipado por categoria.
- Clique em `Equipar melhores` e confira preenchimento automatico por categoria.

### Ranking
- Abra `Ranking` e troque metrica.
- Confirme exibicao por username.

### Trade
- Marque itens negociaveis no inventario.
- Busque jogador por username.
- Envie proposta e responda com outra conta.

## 7) Deploy gratis (Cloudflare Pages)
### Git
```bash
git add .
git commit -m "fix: diagnostico e correcoes de loja username conversao e inventario"
git push origin main
```

### Cloudflare Pages
1. Cloudflare -> **Workers & Pages** -> **Create application**.
2. **Import an existing Git repository**.
3. Escolha o repositorio.

Build settings:
- **Framework preset**: `Vite`
- **Build command**: `npm run build`
- **Build output directory**: `dist`

Environment variables (Production e Preview):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 8) Scripts uteis
```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## 9) Seguranca e integridade
- Sem chave hardcoded no frontend.
- RLS ativa nas tabelas sensiveis.
- Operacoes criticas no backend/RPC:
  - `set_profile_username`
  - `convert_seals_to_diamonds`
  - `refresh_loot_box_shop`
  - `open_active_loot_box`
  - `set_item_equipped`
  - `equip_best_items`
  - `create_trade_offer`
  - `respond_trade`

## 10) Proximos upgrades sugeridos
1. Snapshot semanal de ranking.
2. Confirmacao visual custom para troca de item equipado por slot.
3. Mais animacao na abertura de caixa com fallback para `reduceMotion`.
4. Code-splitting por rota para reduzir bundle inicial.
