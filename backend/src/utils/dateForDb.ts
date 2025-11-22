import { Sequelize } from 'sequelize';
import { ajustarDataVencimento } from './dateUtils';

/**
 * Normaliza uma data para ser salva no banco de dados como DATE (YYYY-MM-DD) ou DATETIME (YYYY-MM-DD HH:mm:ss)
 * sem sofrer alterações de timezone pelo Sequelize ou driver do banco.
 * 
 * @param dateInput - Data em string (YYYY-MM-DD) ou objeto Date
 * @param ajustarVencimento - Se true, aplica regras de ajuste de vencimento (sábado/domingo). Default: true.
 * @param manterHora - Se true, mantém a hora original da data. Se false, zera a hora (00:00:00). Default: false.
 * @returns Literal do Sequelize para inserir a data diretamente na query
 */
export async function normalizeDateForDb(
  dateInput: Date | string, 
  ajustarVencimento: boolean = true,
  manterHora: boolean = false
): Promise<any> { // Retorna any pois o tipo do literal do Sequelize é complexo para tipar estritamente aqui
  let dataLocal: Date;
  
  if (typeof dateInput === 'string') {
    // Garante que a string seja interpretada como data local, não UTC.
    const dateString = dateInput.includes('T') ? dateInput.split('T')[0] : dateInput;
    // Se a string original tiver hora e quisermos manter, precisamos parsear com hora
    if (manterHora && dateInput.includes(':')) {
       dataLocal = new Date(dateInput); // Tenta parsear completo
    } else {
       dataLocal = new Date(`${dateString}T00:00:00`);
    }
  } else {
    dataLocal = dateInput;
  }
  
  if (ajustarVencimento) {
    // Aplica regra de ajuste (sábado/domingo, etc.)
    dataLocal = await ajustarDataVencimento(dataLocal);
  }

  // Formata para string YYYY-MM-DD HH:mm:ss
  const year = dataLocal.getFullYear();
  const month = String(dataLocal.getMonth() + 1).padStart(2, '0');
  const day = String(dataLocal.getDate()).padStart(2, '0');
  
  let timeStr = '00:00:00';
  
  if (manterHora) {
    const hours = String(dataLocal.getHours()).padStart(2, '0');
    const minutes = String(dataLocal.getMinutes()).padStart(2, '0');
    const seconds = String(dataLocal.getSeconds()).padStart(2, '0');
    timeStr = `${hours}:${minutes}:${seconds}`;
  }

  const dataFormatada = `${year}-${month}-${day} ${timeStr}`;
  
  // Retorna literal para garantir que o banco receba a string exata
  return Sequelize.literal(`'${dataFormatada}'`);
}
