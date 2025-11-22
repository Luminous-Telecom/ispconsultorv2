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
 * Formata created_at para exibição (sem conversão de timezone)
 * Função utilitária para ser usada nos modelos
 */
export function formatCreatedAt(dateValue: unknown): string | null {
  if (!dateValue) return null;
  
  try {
    // Se for string, extrair componentes diretamente
    if (typeof dateValue === 'string') {
      const match = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
      }
      return null;
    }
    
    // Se for Date, usar componentes locais (já convertido pelo Sequelize)
    if (dateValue instanceof Date) {
      const day = String(dateValue.getDate()).padStart(2, '0');
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const year = dateValue.getFullYear();
      const hour = String(dateValue.getHours()).padStart(2, '0');
      const minute = String(dateValue.getMinutes()).padStart(2, '0');
      const second = String(dateValue.getSeconds()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
    }
    
    return null;
  } catch {
    return null;
  }
}
