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
    return new Date(date).toLocaleDateString('pt-BR');
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
    return new Date(date).toLocaleString('pt-BR');
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
  
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

/**
 * Formata um CPF progressivamente durante a digitação
 * @param cpf - CPF sem formatação
 * @returns CPF formatado como 000.000.000-00
 */
export const formatCPF = (cpf: string): string => {
  if (!cpf) return '';
  
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

/**
 * Formata um telefone progressivamente durante a digitação
 * @param phone - Telefone sem formatação
 * @returns Telefone formatado como (00) 00000-0000
 */
export const formatPhone = (phone: string): string => {
  if (!phone) return '';
  
  const numbers = phone.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers ? `(${numbers}` : numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

/**
 * Formata um CEP progressivamente durante a digitação
 * @param cep - CEP sem formatação
 * @returns CEP formatado como 00000-000
 */
export const formatCEP = (cep: string): string => {
  if (!cep) return '';
  
  const numbers = cep.replace(/\D/g, '');
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
};
