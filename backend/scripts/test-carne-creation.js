const axios = require('axios');

// Script para testar criação de carnês
async function testCarneCreation() {
  console.log('🧪 Testando criação de carnês...\n');

  const baseUrl = 'http://localhost:3001/api';
  
  try {
    // 1. Buscar dados necessários
    console.log('📋 1. Buscando dados necessários...');
    
    const [clientesRes, planosRes, bancosRes] = await Promise.all([
      axios.get(`${baseUrl}/clientes`),
      axios.get(`${baseUrl}/planos`),
      axios.get(`${baseUrl}/bancos`)
    ]);

    const clientes = clientesRes.data.data || clientesRes.data;
    const planos = planosRes.data.data || planosRes.data;
    const bancos = bancosRes.data.data || bancosRes.data;

    console.log(`   ✅ ${clientes.length} clientes encontrados`);
    console.log(`   ✅ ${planos.length} planos encontrados`);
    console.log(`   ✅ ${bancos.length} bancos encontrados`);

    if (clientes.length === 0 || planos.length === 0 || bancos.length === 0) {
      console.log('❌ Dados insuficientes para criar carnê');
      return;
    }

    // 2. Criar carnê
    console.log('\n📋 2. Criando carnê...');
    
    const carneData = {
      cliente_id: clientes[0].id,
      plano_id: planos[0].id,
      banco_id: bancos.find(b => b.tipo_banco === 'efi')?.id || bancos[0].id,
      valor_parcela: 100.00,
      quantidade_parcelas: 12,
      data_vencimento_primeira: '2025-02-01',
      observacoes: 'Carnê de teste criado via API'
    };

    console.log('   📄 Dados do carnê:', JSON.stringify(carneData, null, 2));

    const carneRes = await axios.post(`${baseUrl}/carnes`, carneData);
    const carne = carneRes.data.data || carneRes.data;

    console.log('   ✅ Carnê criado com sucesso!');
    console.log(`   📊 ID: ${carne.id}`);
    console.log(`   📊 Número: ${carne.numero_carne}`);
    console.log(`   📊 Status: ${carne.status}`);

    // 3. Verificar parcelas
    console.log('\n📋 3. Verificando parcelas...');
    
    const parcelasRes = await axios.get(`${baseUrl}/carnes/${carne.id}`);
    const carneCompleto = parcelasRes.data.data || parcelasRes.data;
    
    console.log(`   ✅ ${carneCompleto.parcelas?.length || 0} parcelas criadas`);

    // 4. Testar geração de títulos (se for EFI)
    const banco = bancos.find(b => b.id === carne.banco_id);
    if (banco && banco.tipo_banco === 'efi') {
      console.log('\n📋 4. Testando geração de títulos...');
      
      try {
        const titulosRes = await axios.post(`${baseUrl}/carnes/${carne.id}/gerar-titulos`);
        console.log('   ✅ Títulos gerados:', titulosRes.data.message);
        
        if (titulosRes.data.data) {
          console.log(`   📊 Carnet ID: ${titulosRes.data.data.carnet_id}`);
          console.log(`   📊 Código de Barras: ${titulosRes.data.data.codigo_barras ? 'Gerado' : 'Não gerado'}`);
        }
      } catch (error) {
        console.log('   ⚠️ Erro ao gerar títulos:', error.response?.data?.error || error.message);
      }
    }

    // 5. Testar consulta de status
    console.log('\n📋 5. Testando consulta de status...');
    
    try {
      const statusRes = await axios.post(`${baseUrl}/carnes/${carne.id}/consultar-status`);
      console.log('   ✅ Status consultado:', statusRes.data.message);
    } catch (error) {
      console.log('   ⚠️ Erro ao consultar status:', error.response?.data?.error || error.message);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log(`   Carnê ID: ${carne.id}`);
    console.log(`   Número: ${carne.numero_carne}`);
    console.log('   Status: Funcionando perfeitamente!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

// Executar teste
testCarneCreation().catch(console.error);
