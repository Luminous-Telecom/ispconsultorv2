const axios = require('axios');

// Script para testar todas as credenciais EFI
async function testAllEfiCredentials() {
  console.log('🧪 Testando todas as credenciais EFI...\n');

  const credentials = [
    {
      name: 'Banco 7 - EFI-CPF (Produção)',
      client_id: 'Client_Id_0991ebdcb59a120927f85062f728b836d0223e1f',
      client_secret: 'Client_Secret_19638fdb04fb2840463d4b6135fa12cbabc8c678',
      sandbox: false
    },
    {
      name: 'Banco 8 - EFI-PJ-TESTE (Sandbox)',
      client_id: 'Client_Id_2f59efeeda79497917e16c666b7a1554a8e39632',
      client_secret: 'Client_Secret_2f2463872412ea52d1c1e5fbcd573989f5fdacf6',
      sandbox: true
    },
    {
      name: 'Banco 9 - EFI-PRODUÇÃO (Produção)',
      client_id: 'Client_Id_5b035beddd70fe14f3b834ed412c2fa7d46dd7d0',
      client_secret: 'Client_Secret_2bfcb07de369bd491d9cc074bf901765e93e360f',
      sandbox: false
    }
  ];

  const token = '74f0df09-21cd-4c26-9779-3bd43d07b04f';

  for (const cred of credentials) {
    console.log(`\n🔑 Testando: ${cred.name}`);
    console.log(`   Sandbox: ${cred.sandbox}`);
    
    try {
      // Obter token de acesso
      const authResponse = await axios.post('https://cobrancas.api.efipay.com.br/v1/authorize', {
        client_id: cred.client_id,
        client_secret: cred.client_secret,
        grant_type: 'client_credentials'
      });

      const accessToken = authResponse.data.access_token;
      console.log('   ✅ Token obtido com sucesso');

      // Testar consulta de notificação
      const notificationResponse = await axios.get(
        `https://cobrancas.api.efipay.com.br/v1/notification/${token}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      console.log('   ✅ Notificação consultada com sucesso!');
      console.log('   📄 Dados:', JSON.stringify(notificationResponse.data, null, 2));
      
      // Se chegou aqui, encontramos a credencial correta
      console.log(`\n🎉 CREDENCIAL CORRETA ENCONTRADA: ${cred.name}`);
      break;

    } catch (error) {
      if (error.response?.status === 401) {
        console.log('   ❌ Unauthorized - Credenciais não têm acesso');
      } else if (error.response?.status === 500 && error.response?.data?.code === 3500010) {
        console.log('   ❌ Token não existe para estas credenciais');
      } else {
        console.log('   ❌ Erro:', error.response?.status, error.response?.data);
      }
    }
  }
}

// Executar teste
testAllEfiCredentials().catch(console.error);
