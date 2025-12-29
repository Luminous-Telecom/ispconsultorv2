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

/**
 * Valida um objeto de formulário de cliente
 * @param formData - Dados do formulário
 * @returns Objeto com erros encontrados
 */
export const validateClienteForm = (formData: Record<string, string | unknown>): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  const cnpj = typeof formData.cnpj === 'string' ? formData.cnpj : '';
  const cnpjError = clienteValidators.cnpj(cnpj);
  if (cnpjError) errors.cnpj = cnpjError;
  
  const razaoSocial = typeof formData.razao_social === 'string' ? formData.razao_social : '';
  const razaoSocialError = clienteValidators.razao_social(razaoSocial);
  if (razaoSocialError) errors.razao_social = razaoSocialError;
  
  const nomeFantasia = typeof formData.nome_fantasia === 'string' ? formData.nome_fantasia : '';
  const nomeFantasiaError = clienteValidators.nome_fantasia(nomeFantasia);
  if (nomeFantasiaError) errors.nome_fantasia = nomeFantasiaError;
  
  const email = typeof formData.email === 'string' ? formData.email : '';
  const emailError = clienteValidators.email(email);
  if (emailError) errors.email = emailError;
  
  const telefone = typeof formData.telefone === 'string' ? formData.telefone : '';
  const telefoneError = clienteValidators.telefone(telefone);
  if (telefoneError) errors.telefone = telefoneError;
  
  const whatsapp = typeof formData.whatsapp === 'string' ? formData.whatsapp : '';
  const whatsappError = clienteValidators.whatsapp(whatsapp);
  if (whatsappError) errors.whatsapp = whatsappError;
  
  const cep = typeof formData.cep === 'string' ? formData.cep : '';
  const cepError = clienteValidators.cep(cep);
  if (cepError) errors.cep = cepError;
  
  const endereco = typeof formData.endereco === 'string' ? formData.endereco : '';
  const enderecoError = clienteValidators.endereco(endereco);
  if (enderecoError) errors.endereco = enderecoError;
  
  const cidade = typeof formData.cidade === 'string' ? formData.cidade : '';
  const cidadeError = clienteValidators.cidade(cidade);
  if (cidadeError) errors.cidade = cidadeError;
  
  const estado = typeof formData.estado === 'string' ? formData.estado : '';
  const estadoError = clienteValidators.estado(estado);
  if (estadoError) errors.estado = estadoError;
  
  return errors;
};
