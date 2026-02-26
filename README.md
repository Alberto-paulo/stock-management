# StockPro - Gestao de Stock e Operacoes Comerciais

Sistema completo de gestao de stock, vendas, compras, encomendas e dividas com controle de acesso por perfil (RBAC).

## Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript
- **UI:** TailwindCSS + Shadcn/ui
- **Backend:** API Routes do Next.js
- **ORM:** Prisma 5
- **Banco de dados:** PostgreSQL
- **Autenticacao:** NextAuth.js (JWT)
- **Validacao:** Zod

## Funcionalidades

- **Gestao de Stock** - Cadastro de produtos, alertas de stock baixo
- **Compras Diarias** - Registro de compras com atualizacao automatica do stock
- **Vendas Diarias** - Registro de vendas com calculo de lucro
- **Encomendas** - Gestao com 5 status (Pendente, Em Andamento, Completa, Concluida, Cancelada)
- **Dividas** - Controle de dividas e historico de pagamentos
- **Anotacoes** - Notas internas associadas a usuarios e encomendas
- **Relatorios** - Relatorios independentes por modulo
- **Gestao de Usuarios** - CRUD com controle de perfis (RBAC)

## Perfis de Acesso

| Funcionalidade | Admin | Gerente | Funcionario |
|---|---|---|---|
| Dashboard Global | Sim | Sim | Limitado |
| Gestao de Stock | Ver/Editar | Ver/Editar | Ver |
| Compras | Sim | Sim | Nao |
| Vendas | Sim | Sim | Sim |
| Encomendas | Gerir | Gerir | Criar/Ver |
| Dividas | Sim | Sim | Nao |
| Relatorios | Sim | Sim | Nao |
| Usuarios | Sim | Nao | Nao |

## Setup Local

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd stock-management
npm install
```

### 2. Configurar variaveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/stockpro"
NEXTAUTH_SECRET="gere-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Configurar banco de dados

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Popular banco com dados de teste

```bash
npm run seed
```

### 5. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

## Credenciais de Teste (apos seed)

| Perfil | Email | Senha |
|---|---|---|
| Admin | admin@stockpro.com | admin123 |
| Gerente | gerente@stockpro.com | gerente123 |
| Funcionario | funcionario@stockpro.com | func123 |

## Deploy na Vercel

### 1. Criar banco PostgreSQL

Opcoes recomendadas:
- **Neon** (neon.tech) - Free tier disponivel
- **Supabase** (supabase.com) - Free tier disponivel

Copie a `DATABASE_URL` fornecida pelo servico.

### 2. Deploy na Vercel

1. Faca push do codigo para o GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositorio
3. Configure as variaveis de ambiente:
   - `DATABASE_URL` - URL do PostgreSQL (Neon/Supabase)
   - `NEXTAUTH_SECRET` - Gere com `openssl rand -base64 32`
   - `NEXTAUTH_URL` - URL do seu deploy (ex: https://stockpro.vercel.app)

### 3. Rodar migrations em producao

```bash
npx prisma migrate deploy
```

### 4. Popular banco de producao (opcional)

```bash
npm run seed
```

## Estrutura do Projeto

```
src/
  app/
    (auth)/login/          # Pagina de login
    (dashboard)/           # Layout protegido
      dashboard/           # Dashboard principal
      stock/               # Gestao de stock
      purchases/           # Compras
      sales/               # Vendas
      orders/              # Encomendas
      debts/               # Dividas
      notes/               # Anotacoes
      reports/             # Relatorios
      users/               # Gestao de usuarios
    api/                   # API Routes
      auth/[...nextauth]/
      register/
      users/
      products/
      purchases/
      sales/
      orders/
      debts/
      payments/
      notes/
      reports/
  components/
    ui/                    # Componentes Shadcn/ui
    shared/                # Componentes compartilhados
  lib/
    auth.ts                # Configuracao NextAuth
    prisma.ts              # Cliente Prisma
    rbac.ts                # Controle de acesso
    utils.ts               # Utilitarios
    validations.ts         # Schemas Zod
  types/
    next-auth.d.ts         # Tipos NextAuth
  middleware.ts            # Middleware de autenticacao
prisma/
  schema.prisma            # Modelo do banco
  seed.ts                  # Seed de dados
```

## Modelos do Banco

- **User** - Usuarios com perfis (Admin, Gerente, Funcionario)
- **Product** - Produtos com precos de compra/venda e alertas
- **Purchase/PurchaseItem** - Compras e itens
- **Sale/SaleItem** - Vendas e itens com calculo de lucro
- **Order/OrderItem** - Encomendas com status
- **Debt/Payment** - Dividas e historico de pagamentos
- **Note** - Anotacoes internas
