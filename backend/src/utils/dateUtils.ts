import Parametros from '../models/Parametros';

/**
 * Ajusta a data de vencimento baseado nos parâmetros do sistema
 * Se a data cair em sábado ou domingo e essas opções não estiverem marcadas,
 * move para o próximo dia útil (segunda-feira)
 * 
 * @param dataVencimento - Data de vencimento a ser ajustada
 * @param parametros - Objeto com os parâmetros do sistema (opcional, será buscado se não fornecido)
 * @returns Data ajustada para dia útil se necessário
 */
export async function ajustarDataVencimento(
  dataVencimento: Date,
  parametros?: Parametros | null
): Promise<Date> {
  // Se não foram fornecidos os parâmetros, buscar do banco
  if (!parametros) {
    parametros = await Parametros.findOne();
  }

  // Se não encontrou parâmetros, retornar data original
  if (!parametros) {
    return dataVencimento;
  }

  const dataAjustada = new Date(dataVencimento);
  const diaSemana = dataAjustada.getDay(); // 0 = domingo, 6 = sábado

  // Verificar se é domingo e não está permitido
  if (diaSemana === 0 && !parametros.titulos_vence_domingo) {
    // Mover para segunda-feira (adicionar 1 dia)
    dataAjustada.setDate(dataAjustada.getDate() + 1);
    return dataAjustada;
  }

  // Verificar se é sábado e não está permitido
  if (diaSemana === 6 && !parametros.titulos_vence_sabado) {
    // Mover para segunda-feira (adicionar 2 dias)
    dataAjustada.setDate(dataAjustada.getDate() + 2);
    return dataAjustada;
  }

  // Se não precisa ajustar, retornar data original
  return dataAjustada;
}

/**
 * Converte uma string de data do banco para um objeto Date.
 * Mantida por compatibilidade, mas agora retorna a data diretamente se já for Date.
 */
export function parseDateFromDb(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;

  return new Date(dateInput);
}

/**
 * Cria uma data como UTC meia-noite para evitar problemas de timezone.
 * Se a entrada for apenas uma data (sem hora), cria como meia-noite UTC.
 * Isso evita que o Sequelize adicione horas ao converter para UTC.
 * 
 * @param dateInput - Data como string (YYYY-MM-DD ou ISO) ou Date
 * @returns Date criada como UTC meia-noite se for apenas data, ou Date original se tiver hora
 */
export function createDateAsUTC(dateInput: string | Date): Date {
  if (dateInput instanceof Date) {
    // Se já é Date, verificar se é meia-noite local (provavelmente apenas data)
    if (dateInput.getHours() === 0 && dateInput.getMinutes() === 0 && dateInput.getSeconds() === 0 && dateInput.getMilliseconds() === 0) {
      // Converter para UTC meia-noite
      return new Date(Date.UTC(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate(), 0, 0, 0, 0));
    }
    return dateInput;
  }

  // Se for string no formato YYYY-MM-DD (sem hora), criar como UTC meia-noite
  if (typeof dateInput === 'string') {
    // Verifica se é formato YYYY-MM-DD (sem hora)
    const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (dateOnlyPattern.test(dateInput)) {
      const [year, month, day] = dateInput.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }
    
    // Se tem hora mas não tem timezone, assumir que é UTC
    if (dateInput.includes('T') && !dateInput.endsWith('Z') && !dateInput.includes('+') && !dateInput.match(/-\d\d:?\d\d$/)) {
      return new Date(dateInput + 'Z');
    }
  }

  return new Date(dateInput);
}
