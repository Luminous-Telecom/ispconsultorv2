const axios = require('axios');

// Payload de exemplo do webhook Asaas
const payload = {
  event: 'PAYMENT_RECEIVED',
  payment: {
    id: 'pay_test_1234567890', // Mesmo charge_id do título criado
    status: 'RECEIVED',
    value: 150.50,
    netValue: 147.25,
    paymentDate: '2025-01-05T14:30:00.000Z',
    effectiveDate: '2025-01-05T14:30:00.000Z',
    nossoNumero: '123456789',
    bankSlipUrl: 'https://asaas.com/boleto/123',
    bankSlipDigitableLine: '12345678901234567890123456789012345678901234567890',
    bankSlipBarcode: '12345678901234567890123456789012345678901234567890',
    pixQrCode: '00020101021226860014br.gov.bcb.pix2558pix-qr-h.sandbox.asaas.com/pix-qr/v2/1234567890',
    pixQrCodeImage: 'iVBORw0KGgoAAAANSUhEUgAA...',
    dueDate: '2025-01-10',
    description: 'Pagamento do título de teste'
  }
};

// Headers do webhook
const headers = {
  'asaas-access-token': '96256b755e', // Token do banco Asaas de teste (prefixo)
  'Content-Type': 'application/json',
  'User-Agent': 'Asaas-Webhook/1.0'
};

// Fazer requisição para o webhook
async function testWebhook() {
  try {
    const response = await axios.post('http://localhost:3005/webhook/asaas/', payload, { headers });
    console.log('✅ Webhook enviado com sucesso!');
    console.log('Status:', response.status);
    console.log('Resposta:', response.data);
  } catch (error) {
    console.error('❌ Erro ao enviar webhook:');
    console.error('Status:', error.response?.status);
    console.error('Resposta:', error.response?.data);
    console.error('Erro completo:', error.message);
  }
}

testWebhook();
