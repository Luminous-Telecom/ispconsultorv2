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
 * Converte uma string de data do banco (que pode vir como string devido ao dateStrings: true)
 * para um objeto Date JavaScript corretamente, respeitando o timezone local.
 * 
 * - Se for YYYY-MM-DD (DATE), cria a data no fuso local (meia-noite).
 * - Se for YYYY-MM-DD HH:mm:ss (DATETIME), cria a data com hora no fuso local.
 */
export function parseDateFromDb(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;

  const dateStr = String(dateInput);
  
  // Se for apenas data (YYYY-MM-DD), cria usando componentes locais para evitar conversão UTC->Local
  // Ex: "2025-11-22" -> new Date(2025, 10, 22) -> 22/11/2025 00:00 Local
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Para DateTime (YYYY-MM-DD HH:mm:ss), o construtor padrão do JS parseia como local
  // quando usamos o formato do MySQL (espaço entre data e hora) na maioria dos ambientes Node/Browser modernos.
  return new Date(dateStr);
}
