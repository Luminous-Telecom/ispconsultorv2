// Validações centralizadas para formulários

/**
 * Valida se um CNPJ é válido
 * @param cnpj - CNPJ para validar
 * @returns true se válido, false caso contrário
 */
export const isValidCNPJ = (cnpj: string): boolean => {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Algoritmo de validação do CNPJ
  let sum = 0;
  let weight = 2;
  
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cleaned[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  
  const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  if (parseInt(cleaned[12]) !== firstDigit) return false;
  
  sum = 0;
  weight = 2;
  
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cleaned[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  
  const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  
  return parseInt(cleaned[13]) === secondDigit;
};

/**
 * Valida se um email é válido
 * @param email - Email para validar
 * @returns true se válido, false caso contrário
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida se um telefone é válido
 * @param phone - Telefone para validar
 * @returns true se válido, false caso contrário
 */
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
};

/**
 * Valida se um CEP é válido
 * @param cep - CEP para validar
 * @returns true se válido, false caso contrário
 */
export const isValidCEP = (cep: string): boolean => {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8;
};

/**
 * Validações específicas para cliente
 */
export const clienteValidators = {
  cnpj: (value: string): string | null => {
    if (!value.trim()) return 'CNPJ é obrigatório';
    if (!isValidCNPJ(value)) return 'CNPJ inválido';
    return null;
  },
  
  razao_social: (value: string): string | null => {
    if (!value.trim()) return 'Razão social é obrigatória';
    if (value.trim().length < 2) return 'Razão social deve ter pelo menos 2 caracteres';
    return null;
  },
  
  nome_fantasia: (value: string): string | null => {
    if (value.trim().length > 0 && value.trim().length < 2) {
      return 'Nome fantasia deve ter pelo menos 2 caracteres';
    }
    return null;
  },
  
  email: (value: string): string | null => {
    if (!value.trim()) return 'Email é obrigatório';
    if (!isValidEmail(value)) return 'Email inválido';
    return null;
  },
  
  telefone: (value: string): string | null => {
    if (value.trim().length > 0 && !isValidPhone(value)) {
      return 'Telefone inválido';
    }
    return null;
  },
  
  whatsapp: (value: string): string | null => {
    if (value.trim().length > 0 && !isValidPhone(value)) {
      return 'WhatsApp inválido';
    }
    return null;
  },
  
  cep: (value: string): string | null => {
    if (value.trim().length > 0 && !isValidCEP(value)) {
      return 'CEP inválido';
    }
    return null;
  },
  
  endereco: (value: string): string | null => {
    if (value.trim().length > 0 && value.trim().length < 3) {
      return 'Endereço deve ter pelo menos 3 caracteres';
    }
    return null;
  },
  
  cidade: (value: string): string | null => {
    if (value.trim().length > 0 && value.trim().length < 2) {
      return 'Cidade deve ter pelo menos 2 caracteres';
    }
    return null;
  },
  
  estado: (value: string): string | null => {
    if (value.trim().length > 0 && value.trim().length !== 2) {
      return 'Estado deve ter 2 caracteres';
    }
    return null;
  }
};

/**
 * Valida um objeto de formulário de cliente
 * @param formData - Dados do formulário
 * @returns Objeto com erros encontrados
 */
export const validateClienteForm = (formData: Record<string, any>): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  Object.entries(clienteValidators).forEach(([field, validator]) => {
    const error = validator(formData[field] || '');
    if (error) {
      errors[field] = error;
    }
  });
  
  return errors;
};
