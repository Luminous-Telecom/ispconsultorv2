# Webhook Efí - Sistema CTM Telecom

## Visão Geral

O sistema agora possui webhooks para receber notificações automáticas da Efí sobre mudanças de status de boletos e carnês.

## Endpoints Disponíveis

### 1. Webhook Unificado
- **URL**: `POST /webhook/efi`
- **Uso**: Recebe notificações sobre todos os tipos de operações (boletos individuais, carnês, PIX, etc.)

### 2. Webhook para Carnês (Compatibilidade)
- **URL**: `POST /webhook/efi/carne`
- **Uso**: Recebe notificações sobre carnês completos (mantido para compatibilidade)

## Configuração

### 1. Variáveis de Ambiente

Adicione no arquivo `.env`:

```env
# URL base da aplicação para webhooks
APP_URL=https://seudominio.com

# Habilitar envio de notification_url para Efí (padrão: true)
EFI_SEND_NOTIFICATION_URL=true
```

### 2. URL Pública

Para que a Efí consiga enviar notificações, a aplicação deve estar acessível via HTTPS em um domínio público.

**Exemplo de URLs que funcionam:**
- `https://seudominio.com/webhook/efi`
- `https://api.seudominio.com/webhook/efi/carne`

**URLs que NÃO funcionam:**
- `http://localhost/webhook/efi` (não é HTTPS)
- `https://127.0.0.1/webhook/efi` (não é público)
- `https://192.168.1.100/webhook/efi` (IP local)

## Como Funciona

### 1. Geração de Carnê/Boleto
Quando um carnê ou boleto é gerado via API da Efí, o sistema automaticamente:
- Inclui a URL do webhook no campo `metadata.notification_url`
- A Efí usa essa URL para enviar notificações futuras

### 2. Recebimento de Notificações
Quando a Efí envia uma notificação:
1. O middleware `ValidateEfiWebhook` registra os dados da requisição
2. O `WebhookController` processa a notificação
3. O sistema atualiza automaticamente o status da parcela/carnê
4. Logs detalhados são gerados para auditoria

### 3. Tipos de Notificação Suportados
- **Pagamento confirmado** (`paid`, `settled`)
- **Cancelamento** (`canceled`)
- **Vencimento** (`expired`)
- **Aguardando pagamento** (`waiting`, `pending`)

## Processamento de Tokens de Notificação

O sistema agora processa automaticamente tokens de notificação do EFI:

### 1. Como Funciona
Quando o EFI envia um token de notificação:
1. O sistema identifica que é um token (Content-Type: application/x-www-form-urlencoded)
2. Busca todos os bancos EFI ativos
3. Consulta a notificação usando o token em cada banco
4. Processa os dados retornados

### 2. Estrutura do Token
```json
{
  "notification": "token_da_notificacao_aqui"
}
```

## Estrutura dos Arquivos

```
backend/src/
├── controllers/
│   └── WebhookController.ts          # Controlador principal do webhook
├── services/
│   └── BancoApiService.ts            # Serviço para integração com API Efí
├── middleware/
│   └── ValidateEfiWebhook.ts         # Middleware de validação
├── routes/
│   └── webhookRoutes.ts              # Rotas do webhook
├── config/
│   └── bancos/
│       └── efi.ts                    # Configuração específica da Efí
└── utils/
    └── logger.ts                      # Sistema de logs
```

## Logs

O sistema gera logs detalhados para todas as operações:

- **INFO**: Operações normais (recebimento de webhook, processamento de notificações)
- **WARNING**: Situações que requerem atenção (tipos não reconhecidos, bancos não encontrados)
- **ERROR**: Erros que impedem o funcionamento (falhas de API, erros de banco de dados)

## Status Mapeados

O sistema mapeia os status da Efí para status internos:

| Status Efí | Status Interno |
|------------|----------------|
| `paid`     | `pago`         |
| `settled`  | `pago`         |
| `canceled` | `cancelado`    |
| `expired`  | `vencido`      |
| `waiting`  | `pendente`     |
| `pending`  | `pendente`     |
| `active`   | `ativo`        |
| `inactive` | `inativo`      |

## Exemplo de Uso

### 1. Configurar Banco EFI
```typescript
const banco = await Banco.create({
  nome: 'EFI Pagamentos',
  tipo_banco: 'efi',
  client_id_producao: 'seu_client_id',
  client_secret_producao: 'seu_client_secret',
  ativo: true
});
```

### 2. Gerar Carnê
```typescript
const resultado = await BancoApiService.gerarCarne(carne);
if (resultado.success) {
  console.log('Carnê gerado:', resultado.data.carnet_id);
}
```

### 3. Webhook Automático
Quando a Efí enviar uma notificação, o sistema automaticamente:
- Identifica o tipo de notificação
- Atualiza o status correspondente
- Gera logs para auditoria

## Troubleshooting

### 1. Webhook não recebido
- Verificar se a URL está acessível publicamente
- Verificar se está usando HTTPS
- Verificar logs do middleware

### 2. Notificação não processada
- Verificar se o banco EFI está ativo
- Verificar se as credenciais estão corretas
- Verificar logs do WebhookController

### 3. Status não atualizado
- Verificar se a parcela/carnê existe no banco
- Verificar se o charge_id/carnet_id está correto
- Verificar logs de processamento
