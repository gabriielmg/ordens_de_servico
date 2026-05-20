# OrdemFácil Pro

Sistema de Ordens de Serviço reconstruído com foco em:

- Web app responsivo e mobile-first
- Deploy simples na Vercel
- Arquitetura preparada para Supabase e futura evolução para PWA/app
- Experiência de campo com leitura rápida, filtros eficientes e galeria de imagens

## Stack recomendada

- Frontend: React + Vite + TypeScript
- UI: CSS customizado com componentes reutilizáveis e abordagem mobile-first
- Backend: Supabase
- Banco: PostgreSQL gerenciado pelo Supabase
- Imagens: Supabase Storage
- Auth: Supabase Auth
- Deploy: Vercel

## Justificativa da stack

- React + Vite entrega ótima compatibilidade com Vercel, excelente DX e fácil reaproveitamento para futura camada mobile.
- TypeScript melhora manutenção, previsibilidade e escalabilidade.
- Supabase centraliza autenticação, banco relacional, storage e RLS, reduzindo complexidade operacional.
- PostgreSQL é mais adequado que planilha para relacionamentos entre OS, capelas, usuários e imagens.

## Fluxo de telas

1. Login
2. Dashboard com resumo operacional
3. Filtros por texto, status, data e capelas
4. Listagem de OS em cards
5. Agrupamento opcional por capela
6. Detalhe lateral com metadados e galeria de imagens
7. Painel administrativo para criação de usuários

## Estrutura de pastas

```text
.
├─ public/
│  └─ manifest.webmanifest
├─ src/
│  ├─ components/
│  ├─ data/
│  ├─ lib/
│  ├─ services/
│  ├─ App.tsx
│  ├─ main.tsx
│  ├─ styles.css
│  └─ types.ts
├─ supabase/
│  └─ schema.sql
├─ docs/
│  └─ architecture.md
└─ package.json
```

## Rodando localmente

```bash
npm install
npm run dev
```

Se o ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` não estiver configurado, o sistema inicia em modo demonstração com dados mockados.

## Usando dados reais da planilha Google

1. Crie um arquivo `.env.local` na raiz do projeto.
2. Copie os campos de [`.env.example`](./.env.example).
3. Preencha:

```env
VITE_GOOGLE_SHEETS_API_KEY= SUA_CHAVE
VITE_GOOGLE_SHEETS_SPREADSHEET_ID=1vp45PmYUejX_zQpMWgOMC5AejB7h_wKe4DVPRVrymRU
VITE_GOOGLE_SHEETS_RANGE=Sheet1!A:G
```

4. Ative a `Google Sheets API` no Google Cloud.
5. Gere uma API key e restrinja por HTTP referrer quando publicar.
6. Garanta que a planilha esteja acessível para leitura pela API.
7. Reinicie o `npm run dev`.

### Colunas esperadas

- `A`: Capela
- `B`: Nº OS
- `C`: Vencimento
- `D`: Assunto
- `E`: Descrição
- `F`: Telefone
- `G`: Nome

Atualmente o app consome `A:E` como base da OS. `F` e `G` podem ser incorporadas depois como responsável/contato.

## Credenciais demo

- Admin: `admin@ordemfacil.app` / `123456`
- Técnico: `tecnico@ordemfacil.app` / `123456`

## Próximos passos recomendados

1. Configurar Supabase e aplicar [`supabase/schema.sql`](./supabase/schema.sql)
2. Migrar a planilha Google para tabelas normalizadas
3. Criar Edge Function para onboarding seguro de usuários admin
4. Adicionar cache offline e sincronização incremental
