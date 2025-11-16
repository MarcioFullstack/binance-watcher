# Configuração de Pagamentos em Criptomoedas

Este guia explica como configurar o sistema de verificação automática de pagamentos em criptomoedas.

## Como Funciona

1. **Usuário faz o pagamento**: O usuário envia $15 (ou equivalente em crypto) para a carteira configurada
2. **Registro do pagamento**: O usuário clica em "Registrar Pagamento" na interface
3. **Webhook blockchain**: Um serviço externo monitora a blockchain e envia webhooks quando transações são confirmadas
4. **Verificação automática**: A edge function `crypto-payment-webhook` processa o webhook e ativa a assinatura automaticamente

## Configuração do Webhook Blockchain

### Opção 1: BlockCypher (Recomendado)

1. **Crie uma conta em**: https://www.blockcypher.com/
2. **Configure um webhook**:
   ```bash
   curl -d '{"event": "confirmed-tx", "address": "0xf9ef22c89bd224f911eaf61c43a39460540eac4f", "url": "https://snkdhcilyorroeyeveul.supabase.co/functions/v1/crypto-payment-webhook"}' \
   https://api.blockcypher.com/v1/eth/main/hooks?token=YOUR_TOKEN
   ```

### Opção 2: Alchemy Notify

1. **Crie uma conta em**: https://www.alchemy.com/
2. **Vá para "Notify" no dashboard**
3. **Crie um Address Activity webhook**:
   - **Address**: `0xf9ef22c89bd224f911eaf61c43a39460540eac4f`
   - **Network**: Ethereum Mainnet (ou sua rede preferida)
   - **Webhook URL**: `https://snkdhcilyorroeyeveul.supabase.co/functions/v1/crypto-payment-webhook`
   - **Event Type**: "Incoming Transactions"

### Opção 3: Infura

1. **Crie uma conta em**: https://infura.io/
2. **Configure um webhook** no dashboard para monitorar sua carteira

## Formato do Webhook Esperado

A edge function espera receber webhooks neste formato:

```json
{
  "transaction_hash": "0x...",
  "address": "0xf9ef22c89bd224f911eaf61c43a39460540eac4f",
  "value": 15.0,
  "confirmations": 3,
  "currency": "ETH"
}
```

## Testando Localmente

Para testar o webhook localmente:

```bash
curl -X POST https://snkdhcilyorroeyeveul.supabase.co/functions/v1/crypto-payment-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_hash": "0xtest123",
    "address": "0xf9ef22c89bd224f911eaf61c43a39460540eac4f",
    "value": 15.5,
    "confirmations": 3,
    "currency": "ETH"
  }'
```

## Segurança

- A edge function é pública (não requer JWT) para aceitar webhooks externos
- Requer mínimo de 3 confirmações na blockchain antes de ativar a assinatura
- Aceita pagamentos com margem de 2% (mínimo de $14.70)
- Registra todos os eventos para auditoria

## Monitoramento

Para verificar o status dos pagamentos pendentes:

```sql
SELECT * FROM pending_payments 
WHERE status = 'pending' 
ORDER BY created_at DESC;
```

Para verificar logs da edge function, vá para o dashboard do Lovable Cloud e veja os logs da função `crypto-payment-webhook`.

## Fluxo de Dados

```
Usuário envia crypto → Blockchain confirma → 
Provedor envia webhook → Edge function processa → 
Assinatura ativada automaticamente → 
Usuário redirecionado para Setup Binance
```

## Troubleshooting

**Problema**: Pagamento não foi detectado
- Verifique se o webhook está configurado corretamente no provedor
- Verifique os logs da edge function
- Confirme que o endereço da carteira está correto

**Problema**: Pagamento marcado como "insufficient"
- O valor enviado foi menor que $14.70 (98% de $15)
- Envie a diferença para completar o pagamento

**Problema**: Transação não aparece como confirmada
- Aguarde pelo menos 3 confirmações na blockchain
- Isso pode levar de 30 segundos a alguns minutos dependendo da rede
