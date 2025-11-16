# 📋 ESTRUTURA COMPLETA DO PROJETO NOTTIFY

## 🎯 Visão Geral
NOTTIFY é um monitor PnL profissional para traders de Binance Futures com:
- Monitoramento em tempo real (atualização a cada 5s)
- Alertas inteligentes personalizáveis
- Kill-switch automático para proteção de banca
- Autenticação 2FA (TOTP)
- Pagamentos em USD ou Criptomoedas
- Painel administrativo completo

---

## 🗺️ FLUXO COMPLETO DA APLICAÇÃO

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DO USUÁRIO                          │
└─────────────────────────────────────────────────────────────┘

1. LANDING PAGE (/)
   └─> Apresentação do produto
   └─> CTAs para Login/Signup

2. CADASTRO (/signup)
   ├─> Email + Senha
   ├─> Configuração 2FA (TOTP)
   └─> Redirecionamento → /payment

3. PAGAMENTO (/payment)
   ├─> Opção 1: Cripto ($15 USD ou equivalente)
   │   └─> Registra pagamento pendente
   │   └─> Webhook blockchain confirma automaticamente
   ├─> Opção 2: Voucher
   │   └─> Ativa imediatamente
   └─> Redirecionamento → /setup-binance

4. SETUP BINANCE (/setup-binance)
   ├─> Nome da conta
   ├─> API Key
   ├─> API Secret
   └─> Redirecionamento → /dashboard

5. DASHBOARD (/dashboard)
   ├─> Saldo e carteira
   ├─> PnL diário/não realizado
   ├─> Alertas configuráveis
   ├─> Kill-switch
   └─> Botão Admin (se for admin)

6. CONFIGURAÇÕES (/settings)
   ├─> Gerenciar contas Binance
   ├─> Status da assinatura
   └─> Ativar vouchers

7. PAINEL ADMIN (/admin) [Apenas Admins]
   ├─> Dashboard de estatísticas
   ├─> Gráficos de pagamentos
   ├─> Gerenciar pagamentos pendentes
   └─> Aprovar/Rejeitar manualmente
```

---

## 📁 ESTRUTURA DE ARQUIVOS

```
nottify/
├── src/
│   ├── assets/
│   │   └── nottify-logo.png
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── AlertsConfig.tsx      # Configuração de alertas
│   │   │   ├── BalanceCards.tsx      # Cards de saldo
│   │   │   ├── DashboardHeader.tsx   # Header com botão admin
│   │   │   └── PnLCards.tsx          # Cards de PnL
│   │   │
│   │   ├── ui/                       # Shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── input-otp.tsx         # Para 2FA
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ...
│   │   │
│   │   └── NavLink.tsx               # Link component para rotas
│   │
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   └── useBinanceData.ts         # Hook para dados Binance
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts             # Cliente Supabase
│   │       └── types.ts              # Tipos do banco (auto-gerado)
│   │
│   ├── lib/
│   │   └── utils.ts                  # Funções utilitárias
│   │
│   ├── pages/
│   │   ├── Index.tsx                 # 🆕 Landing Page
│   │   ├── Login.tsx                 # Login
│   │   ├── Signup.tsx                # Cadastro + 2FA
│   │   ├── Payment.tsx               # Pagamento crypto/voucher
│   │   ├── SetupBinance.tsx          # Setup API Binance
│   │   ├── Dashboard.tsx             # Dashboard principal
│   │   ├── Settings.tsx              # Configurações
│   │   ├── Admin.tsx                 # 🆕 Painel Admin
│   │   └── NotFound.tsx              # 404
│   │
│   ├── App.tsx                       # Rotas principais
│   ├── main.tsx                      # Entry point
│   └── index.css                     # Design system
│
├── supabase/
│   ├── functions/
│   │   ├── activate-voucher/         # Ativar voucher
│   │   ├── admin-stats/              # 🆕 Estatísticas admin
│   │   ├── approve-payment/          # 🆕 Aprovar pagamento
│   │   ├── binance-data/             # Buscar dados Binance
│   │   ├── binance-kill-switch/      # Kill-switch
│   │   ├── crypto-payment-webhook/   # 🆕 Webhook blockchain
│   │   └── test-binance-connection/  # Testar conexão
│   │
│   └── config.toml                   # Config Supabase
│
├── CRYPTO_PAYMENT_SETUP.md           # 🆕 Setup de pagamentos
├── HOW_TO_CREATE_ADMIN.md            # 🆕 Como criar admin
└── PROJECT_STRUCTURE.md              # 🆕 Este arquivo
```

---

## 🗄️ ESTRUTURA DO BANCO DE DADOS

### Tabelas Principais

#### 1. **profiles**
```sql
- id (UUID) - PK, referencia auth.users
- email (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 2. **binance_accounts**
```sql
- id (UUID) - PK
- user_id (UUID) - FK para auth.users
- account_name (TEXT)
- api_key (TEXT)
- api_secret (TEXT) - Criptografado
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 3. **risk_settings**
```sql
- id (UUID) - PK
- user_id (UUID) - FK para auth.users
- initial_balance (NUMERIC)
- risk_percent (NUMERIC) - % de perda máxima
- risk_active (BOOLEAN)
- daily_reset (BOOLEAN)
- kill_switch_enabled (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 4. **subscriptions**
```sql
- id (UUID) - PK
- user_id (UUID) - FK para auth.users
- status (TEXT) - 'active', 'inactive'
- expires_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 5. **vouchers**
```sql
- id (UUID) - PK
- code (TEXT) - UNIQUE
- days (INTEGER) - Dias de acesso
- is_used (BOOLEAN)
- used_by (UUID) - FK para auth.users
- used_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

#### 6. **pending_payments** 🆕
```sql
- id (UUID) - PK
- user_id (UUID) - FK para auth.users
- wallet_address (TEXT)
- expected_amount (NUMERIC) - $15.00
- currency (TEXT) - 'USD'
- status (TEXT) - 'pending', 'confirmed', 'rejected', 'insufficient'
- transaction_hash (TEXT)
- confirmed_amount (NUMERIC)
- confirmed_at (TIMESTAMP)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 7. **user_roles** 🆕
```sql
- id (UUID) - PK
- user_id (UUID) - FK para auth.users
- role (app_role) - ENUM: 'admin', 'user'
- created_at (TIMESTAMP)
- UNIQUE (user_id, role)
```

---

## 🔐 SEGURANÇA (RLS)

Todas as tabelas têm **Row Level Security (RLS)** habilitado:

### Políticas Implementadas:
- ✅ Usuários só veem seus próprios dados
- ✅ Admins podem ver todos os dados (usando security definer function)
- ✅ Função `has_role()` para verificar permissões
- ✅ Vouchers públicos para leitura
- ✅ Pagamentos: usuários veem seus; admins veem todos

---

## 🔄 EDGE FUNCTIONS

### 1. **binance-data**
- **Função**: Busca saldo, PnL e posições da Binance
- **Autenticação**: JWT requerida
- **Atualização**: A cada 5 segundos (frontend)

### 2. **binance-kill-switch**
- **Função**: Fecha todas as posições em caso de perda
- **Autenticação**: JWT requerida
- **Trigger**: Manual ou automático (via risk_settings)

### 3. **activate-voucher**
- **Função**: Ativa assinatura com voucher
- **Autenticação**: JWT requerida
- **Validação**: Verifica se voucher não foi usado

### 4. **crypto-payment-webhook** 🆕
- **Função**: Recebe webhooks de blockchain (BlockCypher, Alchemy)
- **Autenticação**: Pública (verify_jwt = false)
- **Validação**: Mínimo 3 confirmações
- **Ação**: Ativa assinatura automaticamente

### 5. **admin-stats** 🆕
- **Função**: Calcula estatísticas para dashboard admin
- **Autenticação**: JWT + verificação de admin
- **Retorna**: Métricas, gráficos, top usuários

### 6. **approve-payment** 🆕
- **Função**: Aprova ou rejeita pagamentos manualmente
- **Autenticação**: JWT + verificação de admin
- **Ações**: approve, reject

### 7. **test-binance-connection**
- **Função**: Testa conexão com API Binance
- **Autenticação**: Pública
- **Uso**: Validar API keys antes de salvar

---

## 🎨 DESIGN SYSTEM

### Cores (HSL)
```css
--background: 210 20% 10%       /* Dark blue-gray */
--foreground: 0 0% 100%         /* White */
--primary: 142 65% 45%          /* Green (brand) */
--card: 210 20% 14%             /* Lighter dark */
--muted: 210 15% 25%            /* Gray */
--destructive: 0 72% 51%        /* Red */
--warning: 38 92% 50%           /* Orange */
--success: 142 65% 45%          /* Green */
```

### Componentes UI
- Usa **Shadcn/ui** com Radix UI primitives
- Tema dark consistente
- Animações suaves
- Responsivo mobile-first

---

## 🚀 COMO COMEÇAR

### 1. Desenvolvimento Local
```bash
# Instalar dependências
npm install

# Iniciar dev server
npm run dev
```

### 2. Criar Primeiro Admin
```sql
-- 1. Pegar user_id
SELECT id, email FROM auth.users WHERE email = 'seu@email.com';

-- 2. Adicionar role
INSERT INTO public.user_roles (user_id, role)
VALUES ('user_id_aqui', 'admin');
```

### 3. Configurar Webhook Blockchain
Ver: `CRYPTO_PAYMENT_SETUP.md`

### 4. Deploy
- Frontend: Automático via Lovable
- Edge Functions: Deploy automático
- Banco: Migrations automáticas

---

## 📊 MÉTRICAS DO ADMIN

### Dashboard inclui:
- 💰 Total recebido
- 📈 Taxa de conversão
- 👥 Usuários ativos/inativos
- ⏳ Pagamentos pendentes
- 📊 Gráficos interativos (Recharts)
- 🏆 Top 5 usuários por valor

---

## 🔧 MANUTENÇÃO

### Adicionar Novo Voucher
```sql
INSERT INTO public.vouchers (code, days, is_used)
VALUES ('NOTT-IFY2-025B-OT01', 30, false);
```

### Verificar Pagamentos Pendentes
```sql
SELECT * FROM pending_payments 
WHERE status = 'pending' 
ORDER BY created_at DESC;
```

### Ver Todos Admins
```sql
SELECT ur.*, u.email 
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

---

## 📝 PRÓXIMAS MELHORIAS SUGERIDAS

1. ✨ Sistema de notificações por email
2. 📊 Exportação de relatórios em PDF
3. 🔗 Webhooks para Slack/Discord/Telegram
4. 📱 App mobile (React Native)
5. 🌐 Suporte multi-idioma
6. 📈 Backtesting de estratégias
7. 🤖 Bot de trading integrado

---

## 🆘 SUPORTE

- 📧 Email: suporte@nottify.com
- 📚 Docs: Ver arquivos *.md na raiz
- 🐛 Bugs: Reportar no sistema

---

**Última atualização**: 16/11/2025
**Versão**: 1.0.0
