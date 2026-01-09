import Parametros from '../../models/sistema/Parametros';

/**
 * Formata um CEP removendo caracteres não numéricos e aplicando máscara 00000-000
 * @param cep - CEP com ou sem formatação
 * @returns CEP formatado como 00000-000 ou string vazia se inválido
 */
export const formatCEP = (cep: string | null | undefined): string => {
  if (!cep) return '';
  const cepLimpo = cep.replace(/\D/g, '');
  return cepLimpo.length === 8 ? `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5, 8)}` : '';
};

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
 * Normaliza uma data para salvar no banco de dados
 * Observação: com o Sequelize usando `timezone: '-03:00'`, aqui evitamos lógica complexa.
 * A única regra necessária é: strings no formato YYYY-MM-DD devem ser interpretadas como
 * data local (00:00 local), para não serem interpretadas como UTC pelo JS (o que poderia
 * "voltar" 3 horas e cair no dia anterior no banco).
 * @param date - Data como string (YYYY-MM-DD) ou Date
 * @returns Date válida (ou null se inválida)
 */
export function normalizeDateForDb(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  
  try {
    if (typeof date === 'string') {
      // Caso crítico: YYYY-MM-DD (sem hora). O JS interpreta como UTC; queremos local.
      const dateOnlyMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateOnlyMatch) {
        const [, yearStr, monthStr, dayStr] = dateOnlyMatch;
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);
        return new Date(year, month - 1, day, 0, 0, 0, 0);
      }

      const dateObj = new Date(date);
      return isNaN(dateObj.getTime()) ? null : dateObj;
    }
    
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Formata uma data para o padrão brasileiro (DD/MM/YYYY)
 * Usa componentes locais do servidor para formatação
 * Trata strings YYYY-MM-DD diretamente para evitar problemas de timezone
 * @param date - Data como string, Date ou null/undefined
 * @returns String formatada como dd/mm/aaaa ou null se inválida
 */
export function formatDate(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  
  try {
    // Se for string no formato YYYY-MM-DD, extrair componentes diretamente
    // Isso evita problemas de timezone ao criar Date object
    if (typeof date === 'string') {
      const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        const [, year, month, day] = isoMatch;
        return `${day}/${month}/${year}`;
      }
      
      // Se não for formato ISO, tentar criar Date
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return null;
      
      // Usa componentes locais para evitar problemas de timezone
      const dayLocal = String(dateObj.getDate()).padStart(2, '0');
      const monthLocal = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yearLocal = dateObj.getFullYear();
      
      return `${dayLocal}/${monthLocal}/${yearLocal}`;
    }
    
    // Se for Date object, usar componentes locais
    if (date instanceof Date) {
      if (isNaN(date.getTime())) return null;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Formata uma data e hora para o padrão brasileiro (DD/MM/YYYY HH:MM:SS)
 * Usa componentes locais do servidor para formatação
 * Trata strings ISO diretamente para evitar problemas de timezone na parte da data
 * @param date - Data como string, Date ou null/undefined
 * @returns String formatada como dd/mm/aaaa hh:mm:ss ou null se inválida
 */
export function formatDateTime(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  
  try {
    // Se for string ISO com data e hora, extrair componentes diretamente
    if (typeof date === 'string') {
      const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})/);
      if (isoMatch) {
        const [, year, month, day, hour, minute, second] = isoMatch;
        return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
      }
      
      // Se for apenas data ISO (YYYY-MM-DD), usar formatDate e adicionar hora zerada
      const dateOnlyMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        return `${day}/${month}/${year} 00:00:00`;
      }
      
      // Se não for formato ISO conhecido, tentar criar Date
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return null;
      
      // Usa componentes locais para evitar problemas de timezone
      const dayLocal = String(dateObj.getDate()).padStart(2, '0');
      const monthLocal = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yearLocal = dateObj.getFullYear();
      const hour = String(dateObj.getHours()).padStart(2, '0');
      const minute = String(dateObj.getMinutes()).padStart(2, '0');
      const second = String(dateObj.getSeconds()).padStart(2, '0');
      
      return `${dayLocal}/${monthLocal}/${yearLocal} ${hour}:${minute}:${second}`;
    }
    
    // Se for Date object, usar componentes locais
    if (date instanceof Date) {
      if (isNaN(date.getTime())) return null;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      const second = String(date.getSeconds()).padStart(2, '0');
      
      return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Formata uma data para formato ISO completo (YYYY-MM-DDTHH:mm:ss.sssZ)
 * Usado para APIs e integrações que requerem formato ISO
 * @param date - Data como string, Date ou null/undefined
 * @returns String no formato ISO ou null se inválida
 */
export function formatDateISO(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return null;
    
    return dateObj.toISOString();
  } catch {
    return null;
  }
}

/**
 * @deprecated Use formatDateISOLocal de timezoneUtils/index.ts
 * Mantido por compatibilidade - reexporta de timezoneUtils
 */
export { formatDateISOLocal } from '../timezoneUtils';

/**
 * Formata created_at para exibição (sem conversão de timezone)
 * Função utilitária para ser usada nos modelos
 * Refatorada para usar formatDateTime internamente
 */
export function formatCreatedAt(dateValue: unknown): string | null {
  if (!dateValue) return null;
  
  try {
    // Se for string, tentar converter para Date primeiro
    if (typeof dateValue === 'string') {
      const dateObj = new Date(dateValue);
      if (!isNaN(dateObj.getTime())) {
        return formatDateTime(dateObj);
      }
      return null;
    }
    
    // Se for Date, usar formatDateTime diretamente
    if (dateValue instanceof Date) {
      return formatDateTime(dateValue);
    }
    
    return null;
  } catch {
    return null;
  }
}
