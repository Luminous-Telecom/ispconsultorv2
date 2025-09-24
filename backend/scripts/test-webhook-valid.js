const axios = require('axios');

// Script para testar webhook com dados válidos
async function testWebhookValid() {
  console.log('🧪 Testando webhook com dados válidos...\n');

  const baseUrl = 'http://localhost:3001';
  
  // Teste 1: Token de notificação válido (simulado)
  console.log('📋 Teste 1: Token de notificação válido');
  try {
    const response = await axios.post(`${baseUrl}/webhook/efi`, 
      'notification=test_token_valid_123', 
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'gn-Tue Sep 23 2025 20:41:08 GMT-0300 (Brasilia Standard Time)'
        }
      }
    );
    console.log('✅ Status:', response.status);
    console.log('📄 Response:', response.data);
  } catch (error) {
    console.log('❌ Erro:', error.response?.status, error.response?.data);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Teste 2: Payload direto de cobrança
  console.log('📋 Teste 2: Payload direto de cobrança');
  try {
    const payload = {
      charge: {
        charge_id: 'test_charge_123',
        status: 'paid',
        total: 10000,
        custom_id: 'carne_1'
      }
    };
    
    const response = await axios.post(`${baseUrl}/webhook/efi`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'gn-Tue Sep 23 2025 20:41:08 GMT-0300 (Brasilia Standard Time)'
      }
    });
    console.log('✅ Status:', response.status);
    console.log('📄 Response:', response.data);
  } catch (error) {
    console.log('❌ Erro:', error.response?.status, error.response?.data);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Teste 3: Payload direto de carnê
  console.log('📋 Teste 3: Payload direto de carnê');
  try {
    const payload = {
      carnet: {
        carnet_id: 'test_carnet_123',
        status: 'paid',
        total: 120000,
        custom_id: 'carne_1'
      }
    };
    
    const response = await axios.post(`${baseUrl}/webhook/efi`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'gn-Tue Sep 23 2025 20:41:08 GMT-0300 (Brasilia Standard Time)'
      }
    });
    console.log('✅ Status:', response.status);
    console.log('📄 Response:', response.data);
  } catch (error) {
    console.log('❌ Erro:', error.response?.status, error.response?.data);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Teste 4: Verificar se o webhook está funcionando
  console.log('📋 Teste 4: Verificar se o webhook está funcionando');
  try {
    const response = await axios.get(`${baseUrl}/webhook/efi`);
    console.log('✅ Status:', response.status);
    console.log('📄 Response:', response.data);
  } catch (error) {
    console.log('❌ Erro:', error.response?.status, error.response?.data);
  }
}

// Executar testes
testWebhookValid().catch(console.error);
