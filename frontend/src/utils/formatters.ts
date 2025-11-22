// Utilitários de formatação centralizados

/**
 * Formata um valor numérico como moeda brasileira
 * @param value - Valor numérico para formatar
 * @param showCurrency - Se deve mostrar o símbolo R$
 * @returns String formatada como moeda
 */
export const formatCurrency = (value: number | string, showCurrency: boolean = true): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return showCurrency ? 'R$ 0,00' : '0,00';
  
  const formatted = numValue.toFixed(2).replace('.', ',');
  return showCurrency ? `R$ ${formatted}` : formatted;
};

/**
 * Formata uma data para o padrão brasileiro
 * @param date - Data como string ou objeto Date
 * @returns String formatada como dd/mm/aaaa
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return '-';
  
  try {
    // Log para debug
    console.log('DEBUG - formatDate - Entrada:', {
      date_raw: date,
      date_type: typeof date,
      date_string: String(date),
    });
    
    let resultado: string;
    
    if (typeof date === 'string') {
      // Se for string ISO com hora (ex: 2026-02-15T03:00:00.000Z), extrair apenas a data
      if (date.includes('T')) {
        const datePart = date.split('T')[0]; // Pega apenas YYYY-MM-DD
        const [year, month, day] = datePart.split('-').map(Number);
        // Criar data local (sem conversão de timezone) para garantir que mostre a data correta
        const localDate = new Date(year, month - 1, day);
        resultado = localDate.toLocaleDateString('pt-BR');
      } else if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Se for apenas YYYY-MM-DD, criar data local diretamente
        const [year, month, day] = date.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        resultado = localDate.toLocaleDateString('pt-BR');
      } else {
        // Outros formatos, tentar criar Date normalmente
        const d = new Date(date);
        if (isNaN(d.getTime())) return '-';
        resultado = d.toLocaleDateString('pt-BR');
      }
    } else {
      // Se for Date object, extrair apenas ano, mês e dia para criar data local
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      const localDate = new Date(year, month, day);
      resultado = localDate.toLocaleDateString('pt-BR');
    }
    
    // Log para debug
    console.log('DEBUG - formatDate - Saída:', {
      date_raw: date,
      resultado_formatado: resultado,
    });
    
    return resultado;
  } catch {
    return '-';
  }
};

/**
 * Formata uma data e hora para o padrão brasileiro
 * @param date - Data como string ou objeto Date
 * @returns String formatada como dd/mm/aaaa hh:mm
 */
export const formatDateTime = (date: string | Date): string => {
  if (!date) return '-';
  
  try {
    // Log para debug
    console.log('DEBUG - formatDateTime - Entrada:', {
      date_raw: date,
      date_type: typeof date,
      date_string: String(date),
    });
    
    let dateStr = date;
    
    // Se for string e parecer ISO mas sem timezone, assume UTC (append Z)
    // Isso corrige o problema onde o backend envia UTC (ex: 13:00) sem Z, 
    // e o navegador interpreta como Local (13:00), exibindo 3h a mais que o real (10:00)
    if (typeof date === 'string') {
      if ((date.includes('T') || date.includes(' ')) && !date.endsWith('Z') && !date.includes('+') && !date.match(/-\d\d:?\d\d$/)) {
        // Verifica se já não tem offset no final (ex: -03:00)
        dateStr = `${date}Z`;
        console.log('DEBUG - formatDateTime - Adicionado Z:', {
          original: date,
          com_Z: dateStr,
        });
      }
    }

    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    
    const resultado = d.toLocaleString('pt-BR');
    
    // Log para debug
    console.log('DEBUG - formatDateTime - Saída:', {
      date_raw: date,
      date_str_processado: dateStr,
      date_object: d,
      date_iso: d.toISOString(),
      date_utc_string: d.toUTCString(),
      resultado_formatado: resultado,
    });
    
    // Para DateTime completo, geralmente queremos a conversão para o horário local do usuário
    return resultado;
  } catch {
    return '-';
  }
};

/**
 * Formata um número como porcentagem
 * @param value - Valor numérico para formatar
 * @returns String formatada como porcentagem
 */
export const formatPercentage = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '-';
  
  return `${numValue}%`;
};

/**
 * Formata um CNPJ progressivamente durante a digitação
 * @param cnpj - CNPJ sem formatação
 * @returns CNPJ formatado como 00.000.000/0000-00
 */
export const formatCNPJ = (cnpj: string): string => {
  if (!cnpj) return '';
  
  // Remove todos os caracteres não numéricos
  const numbers = cnpj.replace(/\D/g, '');
  
  // Limita a 14 dígitos (tamanho máximo do CNPJ)
  const limitedNumbers = numbers.slice(0, 14);
  
  // Retorna sem formatação se tiver menos de 3 dígitos
  if (limitedNumbers.length <= 2) return limitedNumbers;
  
  // Formata progressivamente
  if (limitedNumbers.length <= 5) {
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2)}`;
  }
  if (limitedNumbers.length <= 8) {
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5)}`;
  }
  if (limitedNumbers.length <= 12) {
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8)}`;
  }
  
  return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8, 12)}-${limitedNumbers.slice(12, 14)}`;
};

/**
 * Formata um CPF progressivamente durante a digitação
 * @param cpf - CPF sem formatação
 * @returns CPF formatado como 000.000.000-00
 */
export const formatCPF = (cpf: string): string => {
  if (!cpf) return '';
  
  const numbers = cpf.replace(/\D/g, '');
  const limitedNumbers = numbers.slice(0, 11); // Limita a 11 dígitos
  
  if (limitedNumbers.length <= 3) return limitedNumbers;
  if (limitedNumbers.length <= 6) return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3)}`;
  if (limitedNumbers.length <= 9) return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6)}`;
  return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6, 9)}-${limitedNumbers.slice(9, 11)}`;
};

/**
 * Formata um telefone progressivamente durante a digitação
 * @param phone - Telefone sem formatação
 * @returns Telefone formatado como (00) 00000-0000
 */
export const formatPhone = (phone: string): string => {
  if (!phone) return '';
  
  const numbers = phone.replace(/\D/g, '');
  const limitedNumbers = numbers.slice(0, 11); // Limita a 11 dígitos (DDD + 9 dígitos)
  
  if (limitedNumbers.length <= 2) return limitedNumbers ? `(${limitedNumbers}` : limitedNumbers;
  if (limitedNumbers.length <= 6) return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2)}`;
  if (limitedNumbers.length <= 10) return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 6)}-${limitedNumbers.slice(6)}`;
  return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 7)}-${limitedNumbers.slice(7, 11)}`;
};

/**
 * Formata um CEP progressivamente durante a digitação
 * @param cep - CEP sem formatação
 * @returns CEP formatado como 00000-000
 */
export const formatCEP = (cep: string): string => {
  if (!cep) return '';
  
  const numbers = cep.replace(/\D/g, '');
  const limitedNumbers = numbers.slice(0, 8); // Limita a 8 dígitos
  
  if (limitedNumbers.length <= 5) return limitedNumbers;
  return `${limitedNumbers.slice(0, 5)}-${limitedNumbers.slice(5, 8)}`;
};
