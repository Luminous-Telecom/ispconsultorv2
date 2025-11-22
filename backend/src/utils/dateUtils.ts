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
 * Normaliza uma data para salvar no banco de dados
 * Garante que datas sem hora sejam salvas como meia-noite no timezone local (não UTC)
 * Isso evita problemas onde "2025-12-15" vira "2025-12-14 21:00:00" no banco
 * @param date - Data como string (YYYY-MM-DD) ou Date
 * @returns Date normalizada para meia-noite no timezone local
 */
export function normalizeDateForDb(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  
  try {
    // Se for string no formato YYYY-MM-DD, criar Date usando componentes locais
    if (typeof date === 'string') {
      const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        const [, year, month, day] = isoMatch.map(Number);
        // Criar Date usando componentes locais (meia-noite local, não UTC)
        return new Date(year, month - 1, day, 0, 0, 0, 0);
      }
      
      // Se não for formato ISO conhecido, tentar criar Date normalmente
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return null;
      
      // Se a data criada tem hora zerada (ou muito próxima), normalizar para meia-noite local
      if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0 && dateObj.getSeconds() === 0) {
        return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0, 0);
      }
      
      return dateObj;
    }
    
    // Se for Date object, garantir que seja meia-noite local se não tiver hora específica
    if (date instanceof Date) {
      if (isNaN(date.getTime())) return null;
      
      // Se já tem hora específica (não é meia-noite), manter como está
      if (date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0 || date.getMilliseconds() !== 0) {
        return date;
      }
      
      // Se é meia-noite, garantir que seja meia-noite local (não UTC)
      return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
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
