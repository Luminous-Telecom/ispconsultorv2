// Script de teste para verificar geração de linha digitável
const { CarneParcela } = require('./backend/src/models');

async function testarLinhaDigitavel() {
  try {
    console.log('Testando geração de linha digitável...');
    
    // Simular dados de uma parcela
    const parcela = {
      id: 1,
      numero_parcela: 1,
      carne_id: 5,
      getCarne: async () => ({
        id: 5,
        getBanco: async () => ({
          codigo: '237'
        })
      })
    };
    
    // Simular método gerarCodigoBarras
    const codigoBanco = '237';
    const carneId = '5'.padStart(8, '0');
    const numeroParcela = '1'.padStart(2, '0');
    const zeros = '00000000000';
    
    const codigoCompleto = `${codigoBanco}${carneId}${numeroParcela}${zeros}`;
    const codigoFinal = codigoCompleto.padEnd(47, '0');
    
    console.log('Código completo:', codigoCompleto);
    console.log('Tamanho código completo:', codigoCompleto.length);
    console.log('Código final:', codigoFinal);
    console.log('Tamanho código final:', codigoFinal.length);
    
    // Gerar linha digitável
    const linhaDigitavel = 
      codigoFinal.substring(0, 5) + '.' +
      codigoFinal.substring(5, 10) + ' ' +
      codigoFinal.substring(10, 15) + '.' +
      codigoFinal.substring(15, 21) + ' ' +
      codigoFinal.substring(21, 26) + '.' +
      codigoFinal.substring(26, 32) + ' ' +
      codigoFinal.substring(32, 33) + ' ' +
      codigoFinal.substring(33);
    
    console.log('Linha digitável gerada:', linhaDigitavel);
    console.log('Tamanho linha digitável:', linhaDigitavel.length);
    
  } catch (error) {
    console.error('Erro no teste:', error);
  }
}

testarLinhaDigitavel();
