#!/usr/bin/env node

const axios = require('axios');

/**
 * Script para testar o webhook EFI
 */
class WebhookTester {
  constructor() {
    this.baseUrl = process.env.API_URL || 'http://localhost:3001';
    this.webhookUrl = `${this.baseUrl}/webhook/efi`;
  }

  async testWebhook() {
    console.log('🧪 Testando webhook EFI...');
    console.log('🌐 URL:', this.webhookUrl);
    console.log('=' .repeat(50));

    // Teste 1: Webhook básico
    await this.testBasicWebhook();
    
    // Teste 2: Notificação de charge
    await this.testChargeNotification();
    
    // Teste 3: Notificação de carnê
    await this.testCarnetNotification();
    
    // Teste 4: Token de notificação
    await this.testNotificationToken();
  }

  async testBasicWebhook() {
    console.log('\n📋 Teste 1: Webhook básico');
    try {
      const response = await axios.post(this.webhookUrl, {
        test: true,
        message: 'Teste básico do webhook'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      console.log('✅ Status:', response.status);
      console.log('📄 Resposta:', response.data);
    } catch (error) {
      console.log('❌ Erro:', error.message);
      if (error.response) {
        console.log('📄 Resposta de erro:', error.response.data);
      }
    }
  }

  async testChargeNotification() {
    console.log('\n📋 Teste 2: Notificação de charge');
    try {
      const payload = {
        notification: {
          type: 'charge_paid',
          charge: {
            charge_id: 'test_charge_123',
            status: 'paid',
            total: 15000,
            created_at: new Date().toISOString()
          }
        }
      };

      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      console.log('✅ Status:', response.status);
      console.log('📄 Resposta:', response.data);
    } catch (error) {
      console.log('❌ Erro:', error.message);
      if (error.response) {
        console.log('📄 Resposta de erro:', error.response.data);
      }
    }
  }

  async testCarnetNotification() {
    console.log('\n📋 Teste 3: Notificação de carnê');
    try {
      const payload = {
        notification: {
          type: 'carnet_paid',
          carnet: {
            carnet_id: 'test_carnet_456',
            status: 'paid',
            total: 30000,
            created_at: new Date().toISOString()
          }
        }
      };

      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      console.log('✅ Status:', response.status);
      console.log('📄 Resposta:', response.data);
    } catch (error) {
      console.log('❌ Erro:', error.message);
      if (error.response) {
        console.log('📄 Resposta de erro:', error.response.data);
      }
    }
  }

  async testNotificationToken() {
    console.log('\n📋 Teste 4: Token de notificação');
    try {
      const payload = new URLSearchParams({
        notification: 'test_token_789'
      });

      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000
      });

      console.log('✅ Status:', response.status);
      console.log('📄 Resposta:', response.data);
    } catch (error) {
      console.log('❌ Erro:', error.message);
      if (error.response) {
        console.log('📄 Resposta de erro:', error.response.data);
      }
    }
  }

  async checkServerStatus() {
    console.log('🔍 Verificando status do servidor...');
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 3000
      });
      console.log('✅ Servidor online:', response.status);
      return true;
    } catch (error) {
      console.log('❌ Servidor offline:', error.message);
      return false;
    }
  }
}

// Executar os testes
async function main() {
  const tester = new WebhookTester();
  
  const isServerOnline = await tester.checkServerStatus();
  if (!isServerOnline) {
    console.log('\n⚠️  Servidor não está rodando. Inicie o servidor primeiro:');
    console.log('   npm run dev');
    process.exit(1);
  }

  await tester.testWebhook();
  
  console.log('\n🎉 Testes concluídos!');
  console.log('💡 Verifique os logs do servidor para mais detalhes');
}

main().catch(console.error);
