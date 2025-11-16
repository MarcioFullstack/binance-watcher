# Como Criar um Administrador

Este guia explica como adicionar a role de administrador a um usuário.

## Método 1: Via SQL no Backend do Lovable Cloud

1. **Acesse o Backend**: Clique em "View Backend" no painel do Lovable Cloud
2. **Vá para o SQL Editor**
3. **Execute o seguinte comando** (substitua `USER_EMAIL` pelo email do usuário):

```sql
-- Primeiro, encontre o user_id pelo email
SELECT id, email FROM auth.users WHERE email = 'USER_EMAIL';

-- Depois, adicione a role de admin (substitua USER_ID_AQUI pelo ID retornado acima)
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_AQUI', 'admin');
```

### Exemplo Completo

```sql
-- 1. Buscar o user_id
SELECT id, email FROM auth.users WHERE email = 'admin@exemplo.com';
-- Resultado: id = '123e4567-e89b-12d3-a456-426614174000'

-- 2. Adicionar role de admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'admin');
```

## Método 2: Via Insert Tool do Supabase

Se preferir usar a ferramenta de insert do Lovable:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('SEU_USER_ID_AQUI', 'admin');
```

## Verificar Se Um Usuário É Admin

```sql
SELECT ur.*, u.email 
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

## Remover Role de Admin

```sql
DELETE FROM public.user_roles 
WHERE user_id = 'USER_ID_AQUI' 
AND role = 'admin';
```

## Acessar o Painel Admin

Após adicionar a role de admin:

1. Faça logout e login novamente (para atualizar as permissões)
2. No Dashboard, você verá um botão "Admin" no header
3. Clique para acessar o painel administrativo
4. Ou acesse diretamente: `https://seu-dominio/admin`

## Funcionalidades do Painel Admin

- ✅ Visualizar todos os pagamentos pendentes
- ✅ Visualizar histórico completo de transações
- ✅ Aprovar pagamentos manualmente
- ✅ Rejeitar pagamentos
- ✅ Filtrar por status (pendente, confirmado, rejeitado)
- ✅ Ver detalhes completos de cada transação

## Segurança

- ⚡ Roles são armazenadas em tabela separada (não no perfil do usuário)
- ⚡ Usa security definer function para evitar recursão RLS
- ⚡ Políticas RLS garantem que apenas admins acessem dados sensíveis
- ⚡ Verificação server-side em todas as edge functions críticas

## Troubleshooting

**Problema**: Não consigo ver o botão Admin
- Verifique se a role foi adicionada corretamente com a query de verificação
- Faça logout e login novamente
- Limpe o cache do navegador

**Problema**: Acesso negado ao tentar entrar no /admin
- Confirme que o user_id está correto
- Verifique se a role é exatamente 'admin' (lowercase)
- Verifique os logs do Supabase para erros de RLS
