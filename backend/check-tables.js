const { sequelize } = require('./dist/config/database');

async function checkTables() {
  try {
    await sequelize.authenticate();
    console.log('Conexão estabelecida com sucesso.');
    
    // Verificar estrutura da tabela cliente_planos
    const [results] = await sequelize.query('DESCRIBE cliente_planos');
    console.log('\n=== ESTRUTURA DA TABELA cliente_planos ===');
    console.table(results);
    
    // Verificar estrutura da tabela clientes
    const [clientesResults] = await sequelize.query('DESCRIBE clientes');
    console.log('\n=== ESTRUTURA DA TABELA clientes ===');
    console.table(clientesResults);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await sequelize.close();
  }
}

checkTables();
