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
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    // Ajustar para UTC antes de formatar para evitar conversão de fuso horário local
    // Assumindo que a data do banco vem como string ISO ou Date em UTC
    if (typeof date === 'string' && date.includes('T')) {
       return d.toLocaleDateString('pt-BR'); // Se tem hora, deixa o navegador converter para local
    } else if (typeof date === 'string') {
       // Se for apenas data YYYY-MM-DD, força interpretação como UTC meio-dia para evitar problemas de timezone
       const [year, month, day] = date.split('-').map(Number);
       const utcDate = new Date(year, month - 1, day);
       return utcDate.toLocaleDateString('pt-BR');
    }
    
    return d.toLocaleDateString('pt-BR');
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
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    // Para DateTime completo, geralmente queremos a conversão para o horário local do usuário
    return d.toLocaleString('pt-BR');
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
