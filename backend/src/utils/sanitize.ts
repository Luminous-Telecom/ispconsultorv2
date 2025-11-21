/**
 * Utilitários para sanitização de inputs
 * Protege contra XSS, SQL Injection e outros ataques
 */

/**
 * Remove caracteres perigosos e HTML tags de uma string
 * @param input - String a ser sanitizada
 * @param allowHtml - Se true, permite HTML mas remove scripts (padrão: false)
 * @returns String sanitizada
 */
export function sanitizeString(input: string | null | undefined, allowHtml = false): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remover caracteres de controle (exceto quebras de linha e tabs)
  let sanitized = input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  if (!allowHtml) {
    // Remover todas as tags HTML
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    // Escapar caracteres HTML especiais
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  } else {
    // Permitir HTML mas remover scripts e eventos perigosos
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:text\/html/gi, ''); // Remove data URIs perigosos
  }

  // Remover espaços múltiplos e trim
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

/**
 * Sanitiza um email removendo caracteres inválidos
 * @param email - Email a ser sanitizado
 * @returns Email sanitizado ou string vazia
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Remover espaços e caracteres de controle
  let sanitized = email.trim().toLowerCase();
  
  // Remover caracteres inválidos (manter apenas letras, números, @, ., -, _)
  sanitized = sanitized.replace(/[^a-z0-9@._-]/g, '');

  // Validar formato básico de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitiza um número removendo caracteres não numéricos
 * @param input - Valor a ser sanitizado
 * @returns Número ou null se inválido
 */
export function sanitizeNumber(input: string | number | null | undefined): number | null {
  if (typeof input === 'number') {
    return isNaN(input) ? null : input;
  }

  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remover tudo exceto números, ponto e sinal de menos
  const cleaned = input.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? null : parsed;
}

/**
 * Sanitiza um inteiro removendo caracteres não numéricos
 * @param input - Valor a ser sanitizado
 * @returns Inteiro ou null se inválido
 */
export function sanitizeInteger(input: string | number | null | undefined): number | null {
  if (typeof input === 'number') {
    return Number.isInteger(input) ? input : null;
  }

  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remover tudo exceto números e sinal de menos
  const cleaned = input.replace(/[^\d-]/g, '');
  const parsed = parseInt(cleaned, 10);

  return isNaN(parsed) ? null : parsed;
}

/**
 * Sanitiza um CNPJ/CPF removendo caracteres não numéricos
 * @param input - CNPJ/CPF a ser sanitizado
 * @returns String apenas com dígitos
 */
export function sanitizeCnpjCpf(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remover tudo exceto dígitos
  return input.replace(/\D/g, '');
}

/**
 * Sanitiza um CEP removendo caracteres não numéricos
 * @param input - CEP a ser sanitizado
 * @returns String apenas com dígitos
 */
export function sanitizeCep(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remover tudo exceto dígitos
  return input.replace(/\D/g, '');
}

/**
 * Sanitiza um telefone removendo caracteres não numéricos
 * @param input - Telefone a ser sanitizado
 * @returns String apenas com dígitos
 */
export function sanitizePhone(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remover tudo exceto dígitos, + e espaços
  return input.replace(/[^\d+\s]/g, '').trim();
}

/**
 * Sanitiza um objeto recursivamente
 * @param obj - Objeto a ser sanitizado
 * @param options - Opções de sanitização
 * @returns Objeto sanitizado
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: { allowHtml?: boolean; deep?: boolean } = {}
): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const { allowHtml = false, deep = true } = options;
  const sanitized = { ...obj } as T;

  for (const key in sanitized) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      const value = sanitized[key];

      if (typeof value === 'string') {
        // Sanitizar strings
        (sanitized as Record<string, unknown>)[key] = sanitizeString(value, allowHtml);
      } else if (typeof value === 'number') {
        // Validar números
        (sanitized as Record<string, unknown>)[key] = isNaN(value) ? null : value;
      } else if (deep && typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Sanitizar objetos aninhados recursivamente
        (sanitized as Record<string, unknown>)[key] = sanitizeObject(
          value as Record<string, unknown>,
          options
        );
      } else if (deep && Array.isArray(value)) {
        // Sanitizar arrays
        (sanitized as Record<string, unknown>)[key] = value.map((item) => {
          if (typeof item === 'string') {
            return sanitizeString(item, allowHtml);
          } else if (typeof item === 'object' && item !== null) {
            return sanitizeObject(item as Record<string, unknown>, options);
          }
          return item;
        });
      }
    }
  }

  return sanitized;
}

/**
 * Remove caracteres SQL perigosos de uma string
 * Protege contra SQL Injection básico
 * @param input - String a ser sanitizada
 * @returns String sanitizada
 */
export function sanitizeSql(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remover caracteres perigosos para SQL
  return input
    .replace(/['";\\]/g, '') // Remove aspas e ponto e vírgula
    .replace(/--/g, '') // Remove comentários SQL
    .replace(/\/\*/g, '') // Remove comentários SQL
    .replace(/\*\//g, '') // Remove comentários SQL
    .replace(/;/g, ''); // Remove ponto e vírgula
}

/**
 * Sanitiza uma URL removendo protocolos perigosos
 * @param url - URL a ser sanitizada
 * @returns URL sanitizada ou string vazia
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmed = url.trim();

  // Permitir apenas http, https e URLs relativas
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    // Remover caracteres perigosos
    return trimmed.replace(/[<>"']/g, '');
  }

  // Se não começar com protocolo permitido, retornar vazio
  return '';
}

