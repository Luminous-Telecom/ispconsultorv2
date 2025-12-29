// Utilitários de formatação centralizados
// Este arquivo contém APENAS funções que retornam strings para exibição humana

/**
 * Formata um valor numérico como moeda brasileira
 * @param value - Valor numérico para formatar
 * @param showCurrency - Se deve mostrar o símbolo R$
 * @returns String formatada como moeda
 */
export const formatCurrency = (value: number | string, showCurrency: boolean = true): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return showCurrency ? 'R$ 0,00' : '0,00';
  
  return numValue.toLocaleString('pt-BR', {
    style: showCurrency ? 'currency' : 'decimal',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
};

/**
 * Formata um número com separadores de milhar brasileiros
 * @param value - Valor numérico para formatar
 * @returns String formatada com separadores
 */
export const formatNumber = (value: number | string): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) return '0';
  
  return numValue.toLocaleString('pt-BR');
};

/**
 * Formata uma data para o padrão brasileiro (DD/MM/YYYY)
 * Usa o timezone local do navegador para exibição
 * @param date - Data como string, Date ou null/undefined
 * @returns String formatada como dd/mm/aaaa ou '-' se nula
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return '-';
    
    // Usa Intl.DateTimeFormat com timezone local para formatação consistente
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(dateObj);
  } catch {
    return '-';
  }
};

/**
 * Formata uma data e hora para o padrão brasileiro (DD/MM/YYYY HH:MM:SS)
 * Usa o timezone local do navegador para exibição
 * @param date - Data como string, Date ou null/undefined
 * @returns String formatada como dd/mm/aaaa hh:mm:ss ou '-' se nula
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return '-';
    
    // Usa Intl.DateTimeFormat com timezone local para formatação consistente
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(dateObj);
  } catch {
    return '-';
  }
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

/**
 * Formata uma data para o formato "15 de janeiro"
 * @param date - Data como string, Date ou null/undefined
 * @returns String formatada como "DD de mês" ou '-' se nula
 */
export const formatDateLong = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return '-';
    
    const formatted = formatDate(dateObj);
    const meses = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    
    return formatted.replace(/(\d{2})\/(\d{2})\/(\d{4})/, (_, dia, mes) => {
      return `${dia} de ${meses[parseInt(mes) - 1]}`;
    });
  } catch {
    return '-';
  }
};

/**
 * Formata a linha digitável do boleto no padrão FEBRABAN
 * Formato: 00000.00000 00000.000000 00000.000000 0 00000000000000
 * @param linha - Linha digitável com ou sem formatação
 * @returns String formatada no padrão FEBRABAN ou string original se não tiver 47 dígitos
 */
export const formatLinhaDigitavel = (linha: string): string => {
  if (!linha) return '';
  
  // Remove todos os caracteres não numéricos
  const digitos = linha.replace(/\D/g, '');
  
  // Se não tiver 47 dígitos, retorna o valor original (ou limpo)
  if (digitos.length !== 47) {
    return digitos;
  }
  
  // Formata no padrão FEBRABAN: 00000.00000 00000.000000 00000.000000 0 00000000000000
  return `${digitos.substring(0, 5)}.${digitos.substring(5, 10)} ` +
         `${digitos.substring(10, 15)}.${digitos.substring(15, 21)} ` +
         `${digitos.substring(21, 26)}.${digitos.substring(26, 32)} ` +
         `${digitos.substring(32, 33)} ` +
         `${digitos.substring(33)}`;
};
