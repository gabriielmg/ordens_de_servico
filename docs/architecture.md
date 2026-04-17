# Arquitetura do sistema

## Visão geral

O sistema foi redesenhado como um frontend React desacoplado da origem de dados. Isso permite:

- deploy rápido na Vercel
- troca controlada da origem de dados
- evolução futura para PWA
- reaproveitamento de contratos para app mobile

## Arquitetura recomendada

### Camadas

1. `components`
   Componentes de UI reutilizáveis e orientados a mobile-first.
2. `services`
   Camada de acesso a dados e autenticação. Hoje suporta modo demo local e modo Supabase.
3. `lib`
   Utilitários puros, datas, storage local e bootstrap de clientes.
4. `types`
   Contratos centrais do domínio.

### Backend recomendado

- Supabase Auth para login
- Supabase Postgres para entidades de negócio
- Supabase Storage para imagens
- Row Level Security para restringir acesso por perfil
- Edge Functions para ações administrativas sensíveis, como criação de usuários

## Modelagem principal

- `chapels`
  Cadastro de capelas/unidades
- `service_orders`
  Ordem de serviço com assunto, descrição, status e vencimento
- `service_order_images`
  Imagens relacionadas às OS
- `profiles`
  Perfil complementar do usuário autenticado

## Fluxo operacional

1. Usuário autentica
2. Frontend carrega capelas, OS e permissões
3. Usuário filtra por capela, status, texto ou período
4. Abre detalhe da OS com imagens
5. Admin gerencia usuários

## Pronto para mobile

- layout mobile-first
- componentes com baixa dependência do DOM
- serviço centralizado para dados
- manifest já incluído
- possibilidade de evoluir para PWA com cache e sync

## Migração da planilha Google

### Etapa 1

Importar planilha para uma tabela temporária no Supabase.

### Etapa 2

Normalizar dados em `chapels`, `service_orders` e `service_order_images`.

### Etapa 3

Trocar leitura da planilha por consultas parametrizadas via Supabase.

### Etapa 4

Ativar auditoria, políticas RLS e automações de notificação.
