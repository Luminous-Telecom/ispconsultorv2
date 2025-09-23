# 📋 Scripts de Monitoramento de Webhook EFI

Este diretório contém scripts para monitorar, testar e visualizar logs do webhook EFI.

## 🚀 Scripts Disponíveis

### 1. **Script Principal** (`webhook-logs.js`)
Gerenciador principal que coordena todos os outros scripts.

```bash
# Monitorar logs em tempo real
node webhook-logs.js monitor

# Testar webhook com dados simulados
node webhook-logs.js test

# Visualizar logs existentes
node webhook-logs.js view --lines 50

# Seguir logs em tempo real
node webhook-logs.js view --follow

# Filtrar logs por texto
node webhook-logs.js view --filter "efi" --lines 20

# Mostrar ajuda
node webhook-logs.js help
```

### 2. **Monitor de Tempo Real** (`scripts/monitor-webhook.js`)
Monitora logs de webhook em tempo real e exibe novos logs conforme aparecem.

```bash
node scripts/monitor-webhook.js
```

**Funcionalidades:**
- ✅ Monitoramento em tempo real
- ✅ Exibição de logs existentes ao iniciar
- ✅ Formatação amigável com emojis
- ✅ Filtragem automática de logs de webhook
- ✅ Parada graciosa com Ctrl+C

### 3. **Testador de Webhook** (`scripts/test-webhook.js`)
Testa o webhook EFI com diferentes tipos de notificação.

```bash
node scripts/test-webhook.js
```

**Testes Incluídos:**
- ✅ **Teste Básico:** Webhook simples
- ✅ **Notificação de Charge:** Simulação de pagamento de boleto
- ✅ **Notificação de Carnê:** Simulação de pagamento de carnê
- ✅ **Token de Notificação:** Teste de token de notificação

### 4. **Visualizador de Logs** (`scripts/view-webhook-logs.js`)
Visualiza logs de webhook de forma amigável e organizada.

```bash
# Visualizar últimas 50 linhas
node scripts/view-webhook-logs.js --lines 50

# Seguir logs em tempo real
node scripts/view-webhook-logs.js --follow

# Filtrar por texto específico
node scripts/view-webhook-logs.js --filter "efi" --lines 20

# Formato JSON
node scripts/view-webhook-logs.js --format json --lines 10

# Mostrar ajuda
node scripts/view-webhook-logs.js --help
```

## 📊 Tipos de Logs Monitorados

Os scripts filtram automaticamente logs relacionados a:

- 🔔 **Webhook:** Logs de recebimento de webhooks
- 🏦 **EFI:** Logs de comunicação com a EFI
- 📧 **Notification:** Logs de notificações
- 💳 **Charge:** Logs de cobranças individuais
- 📋 **Carnet:** Logs de carnês
- ⚡ **Liquidar:** Logs de liquidação de parcelas
- ❌ **Cancelar:** Logs de cancelamento
- 🔄 **Alterar:** Logs de alteração de vencimento

## 🎯 Exemplos de Uso

### Monitoramento em Desenvolvimento
```bash
# Terminal 1: Iniciar servidor
npm run dev

# Terminal 2: Monitorar webhook
node webhook-logs.js monitor
```

### Teste de Webhook
```bash
# Testar webhook com dados simulados
node webhook-logs.js test

# Verificar logs gerados
node webhook-logs.js view --lines 10
```

### Debug de Problemas
```bash
# Filtrar logs de erro
node webhook-logs.js view --filter "error" --lines 20

# Seguir logs em tempo real
node webhook-logs.js view --follow --filter "efi"
```

### Análise de Logs
```bash
# Exportar logs em formato JSON
node webhook-logs.js view --format json --lines 100 > webhook-logs.json

# Filtrar por parcela específica
node webhook-logs.js view --filter "parcela_id:115" --lines 50
```

## 🔧 Configuração

### Variáveis de Ambiente
```bash
# URL da API (padrão: http://localhost:3001)
export API_URL=http://localhost:3001

# Nível de log (padrão: info)
export LOG_LEVEL=debug
```

### Estrutura de Logs
Os logs são salvos em:
- `logs/combined.log` - Todos os logs
- `logs/error.log` - Apenas erros
- `logs/backend-*.log` - Logs do PM2

## 📈 Interpretação de Logs

### Logs de Sucesso
```
ℹ️ 23/09/2025, 20:01:10
📝 Parcela liquidada com sucesso na EFI
🆔 Parcela ID: 115
```

### Logs de Erro
```
❌ 23/09/2025, 20:01:10
📝 Erro ao liquidar parcela na EFI
🆔 Parcela ID: 115
❌ Erro: Token expirado
```

### Logs de Webhook
```
ℹ️ 23/09/2025, 20:01:10
📝 === WEBHOOK EFÍ UNIFICADO RECEBIDO ===
📝 Processando notificação do tipo: charge_paid
```

## 🚨 Troubleshooting

### Webhook não está recebendo notificações
1. Verificar se o servidor está rodando
2. Testar com `node webhook-logs.js test`
3. Verificar logs com `node webhook-logs.js view --follow`

### Logs não aparecem
1. Verificar se o diretório `logs/` existe
2. Verificar permissões de escrita
3. Verificar configuração do Winston

### Testes falham
1. Verificar se o servidor está online
2. Verificar se a rota `/webhook/efi` está configurada
3. Verificar logs de erro do servidor

## 📝 Notas Importantes

- Os scripts são executáveis (`chmod +x`)
- Todos os scripts suportam Ctrl+C para parada graciosa
- Logs são filtrados automaticamente por relevância
- Testes usam dados simulados (não afetam produção)
- Monitoramento em tempo real usa `fs.watchFile`

## 🔗 Integração com PM2

Para usar com PM2 em produção:

```bash
# Monitorar logs do PM2
pm2 logs --lines 100

# Filtrar logs de webhook
pm2 logs | grep -i "webhook\|efi"
```
