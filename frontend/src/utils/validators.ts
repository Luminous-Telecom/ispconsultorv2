// Validações centralizadas para formulários

/**
 * Valida se uma string é um IPv4 válido (4 octetos 0-255, ex: 192.168.1.1).
 * Não aceita pontos no final nem octetos vazios (ex: 45.224.181.)
 */
export const isValidIPv4 = (ip: string | null | undefined): boolean => {
  if (!ip || typeof ip !== 'string') return false;
  const trimmed = ip.trim();
  const match = trimmed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10);
    if (Number.isNaN(octet) || octet < 0 || octet > 255) return false;
  }
  return true;
};

/**
 * Valida se uma string é um IPv6 válido (8 grupos hex 1-4 dígitos, com : ou ::).
 * Ex: 2001:0db8:85a3:0000:0000:8a2e:0370:7334 ou 2001:db8::1
 */
export const isValidIPv6 = (ip: string | null | undefined): boolean => {
  if (!ip || typeof ip !== 'string') return false;
  const s = ip.trim();
  if (!s) return false;
  if (s.includes(':::')) return false;

  const doubleColonMatches = s.match(/::/g);
  if ((doubleColonMatches?.length ?? 0) > 1) return false;

  const hexGroup = /^[0-9a-fA-F]{1,4}$/;

  if (s.includes('::')) {
    const [left, right] = s.split('::');
    const leftParts = left ? left.split(':') : [];
    const rightParts = right ? right.split(':') : [];

    if (leftParts.some((part) => !hexGroup.test(part))) return false;
    if (rightParts.some((part) => !hexGroup.test(part))) return false;

    const totalGroups = leftParts.length + rightParts.length;
    return totalGroups < 8;
  }

  const parts = s.split(':');
  if (parts.length !== 8) return false;

  for (const p of parts) {
    if (!hexGroup.test(p)) return false;
  }

  return true;
};

/**
 * Valida se um CNPJ é válido
 * @param cnpj - CNPJ para validar
 * @returns true se válido, false caso contrário
 */
/** Remove a máscara e limita às 14 posições. Letras permanecem (CNPJ alfanumérico). */
export const stripCnpj = (cnpj: string): string =>
  cnpj.toUpperCase().replace(/[^0-9A-Z]/g, '');

export const isNumericCnpj = (cnpj: string): boolean => {
  const cleaned = stripCnpj(cnpj);
  return cleaned.length === 14 && /^\d{14}$/.test(cleaned);
};

const cnpjCharValue = (char: string): number => char.charCodeAt(0) - 48;

const cnpjCheckDigit = (base: string): number => {
  let sum = 0;
  let weight = 2;
  for (let index = base.length - 1; index >= 0; index -= 1) {
    sum += cnpjCharValue(base[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
};

export const isValidCNPJ = (cnpj: string): boolean => {
  const cleaned = stripCnpj(cnpj);

  if (!/^[0-9A-Z]{12}\d{2}$/.test(cleaned)) return false;
  if (/^(.)\1{13}$/.test(cleaned)) return false;

  const first = cnpjCheckDigit(cleaned.slice(0, 12));
  const second = cnpjCheckDigit(cleaned.slice(0, 12) + String(first));
  return cleaned.endsWith(`${first}${second}`);
};

/**
 * Valida se um CPF é válido
 * @param cpf - CPF para validar
 * @returns true se válido, false caso contrário
 */
export const isValidCPF = (cpf: string): boolean => {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Algoritmo de validação do CPF
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  
  return digit === parseInt(cleaned[10]);
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
