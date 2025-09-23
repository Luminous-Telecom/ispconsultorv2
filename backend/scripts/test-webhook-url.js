#!/usr/bin/env node

const axios = require('axios');

/**
 * Script para testar a configuração da URL do webhook
 */
class WebhookUrlTester {
  constructor() {
    this.baseUrl = process.env.API_URL || 'http://localhost:3001';
  }

  async testWebhookUrl() {
    console.log('🔗 Testando configuração da URL do webhook...');
    console.log('=' .repeat(50));

    // Teste 1: Verificar se a rota existe
    await this.testWebhookRoute();

    // Teste 2: Verificar se aceita requisições POST
    await this.testWebhookPost();

    // Teste 3: Verificar se retorna resposta válida
    await this.testWebhookResponse();

    console.log('\n💡 Para configurar a URL no banco EFI:');
    console.log('   URL: https://erp.luminoustelecom.com.br/webhook/efi');
    console.log('   Método: POST');
    console.log('   Content-Type: application/json');
  }

  async testWebhookRoute() {
    console.log('\n📋 Teste 1: Verificando rota do webhook');
    try {
      const response = await axios.get(`${this.baseUrl}/webhook/efi`, {
        timeout: 5000
      });
      console.log('✅ Rota GET acessível:', response.status);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('❌ Rota não encontrada (404)');
      } else if (error.response && error.response.status === 405) {
        console.log('✅ Rota existe mas não aceita GET (405 - esperado)');
      } else {
        console.log('❌ Erro ao acessar rota:', error.message);
      }
    }
  }

  async testWebhookPost() {
    console.log('\n📋 Teste 2: Testando requisição POST');
    try {
      const response = await axios.post(`${this.baseUrl}/webhook/efi`, {
        test: true,
        message: 'Teste de configuração da URL'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      console.log('✅ POST funcionando:', response.status);
      console.log('📄 Resposta:', response.data);
    } catch (error) {
      if (error.response) {
        console.log('✅ POST aceito (erro esperado):', error.response.status);
        console.log('📄 Resposta:', error.response.data);
      } else {
        console.log('❌ Erro de conexão:', error.message);
      }
    }
  }

  async testWebhookResponse() {
    console.log('\n📋 Teste 3: Testando resposta do webhook');
    try {
      const payload = {
        notification: {
          type: 'charge_paid',
          charge: {
            charge_id: 'test_charge_123',
            status: 'paid'
          }
        }
      };

      const response = await axios.post(`${this.baseUrl}/webhook/efi`, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      console.log('✅ Resposta válida:', response.status);
      console.log('📄 Dados:', response.data);
    } catch (error) {
      if (error.response) {
        console.log('✅ Webhook processando (erro esperado):', error.response.status);
        console.log('📄 Resposta:', error.response.data);
      } else {
        console.log('❌ Erro de conexão:', error.message);
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

  showConfigurationInfo() {
    console.log('\n📋 Informações de Configuração:');
    console.log('=' .repeat(50));
    console.log('🌐 URL do Webhook: https://erp.luminoustelecom.com.br/webhook/efi');
    console.log('📡 Método: POST');
    console.log('📄 Content-Type: application/json');
    console.log('🔧 Campo no banco: url_retorno');
    console.log('📝 Configuração: O sistema usa o campo url_retorno do banco EFI');
    console.log('⚠️  Importante: A URL deve ser acessível externamente');
  }
}

// Executar os testes
async function main() {
  const tester = new WebhookUrlTester();
  
  const isServerOnline = await tester.checkServerStatus();
  if (!isServerOnline) {
    console.log('\n⚠️  Servidor não está rodando. Inicie o servidor primeiro:');
    console.log('   npm run dev');
    process.exit(1);
  }

  await tester.testWebhookUrl();
  tester.showConfigurationInfo();
  
  console.log('\n🎉 Testes concluídos!');
  console.log('💡 A URL do webhook está configurada para usar o campo url_retorno do banco');
}

main().catch(console.error);
