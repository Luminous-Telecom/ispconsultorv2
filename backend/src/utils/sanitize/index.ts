/**
 * Utilitários para sanitização de inputs
 * Protege contra XSS, SQL Injection e outros ataques
 */

/**
 * Remove apenas caracteres de controle perigosos sem codificar HTML entities
 * Usado para campos de texto simples (nomes, endereços, etc)
 * @param input - String a ser sanitizada
 * @returns String sanitizada
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remover apenas caracteres de controle perigosos (exceto quebras de linha e tabs)
  // Não codificar HTML entities para campos de texto simples
  return input.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '').trim();
}

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
    // Escapar caracteres HTML especiais (exceto / que não precisa ser codificado)
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    // Removido: .replace(/\//g, '&#x2F;') - não codificar barras, causa problemas em URLs e paths
  } else {
    // Permitir HTML mas remover scripts e eventos perigosos
    sanitized = sanitized
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/data:text\/html/gi, ''); // Remove data URIs perigosos
    
    // Para HTML, NÃO remover espaços múltiplos nem fazer trim
    // pois isso pode quebrar a formatação do HTML
    return sanitized;
  }

  // Remover espaços múltiplos e trim apenas para texto sem HTML
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
 * Sanitiza um CNPJ/CPF. CPF permanece só com dígitos. CNPJ alfanumérico conserva A-Z.
 */
export function sanitizeCnpjCpf(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.toUpperCase().replace(/[^0-9A-Z]/g, '');
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

  // Campos que são URLs/paths e não devem ter / escapado nem HTML encoding
  const urlFields = [
    'url_retorno', 'url_boleto', 'api_url', 'url', 'webhook_url', 'notification_url', 'redirect_url', 'callback_url',
    'assinatura_digital_api_url', 'url_assinatura', 'pdf_assinado_url',
    'link_oficio_anatel', 'link_oficio_justica', 'link_planilha_dominios', // Blockdomi - links de ofícios/planilhas
    'evolution_api_url', 'portal_nacional_base_url', 'logo_url', 'url_api'
  ];
  
  // Campos que não devem ter nenhuma sanitização (caminhos de arquivo gerados pelo sistema)
  // Apenas remover caracteres de controle perigosos, sem HTML encoding
  const noSanitizeFields = ['logo', 'responsavel_assinatura'];

  // Campos que podem conter HTML completo (incluindo <head>, <style>, <script>)
  // Para esses campos, preservamos o conteúdo e removemos apenas caracteres de controle perigosos.
  // Observação: isso permite scripts; use apenas em endpoints/admin confiáveis.
  const rawHtmlFields = ['html'];
  
  // Campos que não devem ter HTML encoding (CPF/CNPJ, códigos, nomes, JSON, IPs, hosts, etc)
  const noHtmlEncodeFields = [
    'faixa_ips', // IPs e faixas (IPv4, IPv6, CIDR) - podem ter : / ; etc
    'ip', // IPv4 e IPv6 (Blockdomi)
    'dominio', 'dominios', // Domínios (Blockdomi) - campo e array na importação
    'host', 'host_smtp', // Servidores de email/SMTP - podem ser IP ou hostname
    'dominio_customizado', // Domínio customizado SaaS (ex: meusite.com)
    'variables', // JSON array - preservar aspas
    'template_mapping', // JSON - mapeamento de templates
    'configuracao_extra', // JSON - configurações
    'webhook_events', // JSON - eventos habilitados
    'servicos_inclusos', // JSON array - serviços do plano
    'configuracao', // JSON - configuração de rotinas
    'valor', // JSON - valor de parâmetros (chave-valor)
    'cpf_cnpj_assinante', 
    'cpf_cnpj', 
    'cnpj', 
    'cpf',
    'razao_social',
    'nome_fantasia',
    'nome_razao_social',
    'nome',
    'endereco',
    'complemento',
    'bairro',
    'cidade',
    'numero',
    'telefone',
    'whatsapp',
    'observacoes',
    // RPKI - XMLs de provisioning (não remover tags)
    'responsexml',
    'parentresponsexml',
    'parent_response_xml',
    'parent_child_request_xml',
    'repository_response_xml',
    'repository_request_xml'
  ];
  
  // Campos que contêm HTML e devem ser preservados mesmo quando allowHtml=false
  const htmlFields = [
    'conteudo', 
    'conteudo_contrato', 
    'conteudo_adesao', 
    'conteudo_permanencia', 
    'conteudo_recibo',
    'conteudo_carta',
    'modelo',
    'mensagem_padrao',
    'mensagem_manual'
  ];

  for (const key in sanitized) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      const value = sanitized[key];

      if (typeof value === 'string') {
        // HTML bruto (preservar tags e scripts; remover só caracteres de controle)
        if (rawHtmlFields.includes(key.toLowerCase())) {
          (sanitized as Record<string, unknown>)[key] = value.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
          continue;
        }

        // Campos que não devem ter nenhuma sanitização
        if (noSanitizeFields.includes(key.toLowerCase())) {
          // Apenas remover caracteres de controle perigosos
          (sanitized as Record<string, unknown>)[key] = sanitizeText(value);
        } else if (urlFields.includes(key.toLowerCase())) {
          // Para campos de URL, usar sanitizeUrl que não escapa barras
          (sanitized as Record<string, unknown>)[key] = sanitizeUrl(value);
        } else if (noHtmlEncodeFields.includes(key.toLowerCase())) {
          // Campos que não devem ter HTML encoding (apenas remover caracteres de controle)
          (sanitized as Record<string, unknown>)[key] = sanitizeText(value);
        } else if (htmlFields.includes(key.toLowerCase())) {
          // Campos de HTML: permitir HTML mas remover scripts e eventos perigosos
          (sanitized as Record<string, unknown>)[key] = sanitizeString(value, true);
        } else {
          // Sanitizar outras strings normalmente
          (sanitized as Record<string, unknown>)[key] = sanitizeString(value, allowHtml);
        }
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
            if (urlFields.includes(key.toLowerCase())) {
              return sanitizeUrl(item);
            }
            if (noHtmlEncodeFields.includes(key.toLowerCase())) {
              return sanitizeText(item);
            }
            if (htmlFields.includes(key.toLowerCase())) {
              return sanitizeString(item, true);
            }
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
 * Sanitiza um domínio: remove apenas protocolo. Mantém hostname (incl. subdomínios) e caminho.
 * Remove: https://, http://. Query string (?...) é removida.
 * Exemplos: "https://encurtador.com/abc" -> "encurtador.com/abc"; "https://www.meusite.com" -> "www.meusite.com"
 * @param dominio - Domínio ou URL a ser sanitizado
 * @returns Domínio sem protocolo (hostname ou hostname/caminho) ou string vazia
 */
export function sanitizeDominio(dominio: string | null | undefined): string {
  if (!dominio || typeof dominio !== 'string') {
    return '';
  }

  let cleaned = dominio.trim().toLowerCase();

  // Remover protocolo
  cleaned = cleaned.replace(/^https?:\/\//i, '');

  // Remover barra final se sobrou (antes do path/query)
  cleaned = cleaned.replace(/\/+$/, '').trim();

  // Partes: hostname (obrigatório) e opcionalmente /caminho e ?query
  const firstSlash = cleaned.indexOf('/');
  const hostname = firstSlash === -1 ? cleaned : cleaned.slice(0, firstSlash);
  const pathAndQuery = firstSlash === -1 ? '' : cleaned.slice(firstSlash);

  // Hostname válido: letras, números, hífen, ponto (sem ..). Deve ter pelo menos 1 ponto (ex: site.com).
  if (!hostname || hostname.includes('..') || !hostname.includes('.')) {
    return '';
  }
  if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$|^[a-z0-9]$/i.test(hostname)) {
    return '';
  }

  // Path e query opcionais: permite letras, números, / - _ . % ? # & = [ ] @ ! $ ' ( ) * + , ; : ~
  if (pathAndQuery && !/^\/[\w\-.~:/?#[\]@!$'()*+,;=%&]*$/i.test(pathAndQuery)) {
    return '';
  }

  return hostname + pathAndQuery;
}

/**
 * Valida se uma string é um IPv4 válido (4 octetos 0-255, ex: 192.168.1.1).
 * Não aceita trailing/leading dots nem octetos vazios (ex: 45.224.181.)
 */
export function isValidIPv4(ip: string | null | undefined): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const trimmed = ip.trim();
  const match = trimmed.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10);
    if (Number.isNaN(octet) || octet < 0 || octet > 255) return false;
  }
  return true;
}

/**
 * Valida se uma string é um IPv6 válido (8 grupos hex 1-4 dígitos, com : ou ::).
 * Ex: 2001:0db8:85a3:0000:0000:8a2e:0370:7334 ou 2001:db8::1
 * Não aceita dois pontos seguidos fora da compressão :: nem dois ::
 */
export function isValidIPv6(ip: string | null | undefined): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const s = ip.trim();
  if (s.length < 2) return false;
  if (s.startsWith(':') && !s.startsWith('::')) return false;
  if (s.endsWith(':') && !s.endsWith('::')) return false;
  const parts = s.split(':');
  if (parts.length > 8) return false;
  if (parts.length < 2) return false;
  const emptyCount = parts.filter((p) => p === '').length;
  const hexGroup = /^[0-9a-fA-F]{1,4}$/;
  if (emptyCount > 2) return false;
  if (emptyCount === 2) {
    if (parts.length !== 3) return false;
    const nonEmpty = parts.filter((p) => p !== '');
    if (nonEmpty.length !== 1) return false;
    return hexGroup.test(nonEmpty[0]);
  }
  if (emptyCount === 1) {
    const nonEmpty = parts.filter((p) => p !== '');
    if (nonEmpty.length >= 8) return false;
    for (const p of nonEmpty) {
      if (!hexGroup.test(p)) return false;
    }
    return true;
  }
  if (parts.length !== 8) return false;
  for (const p of parts) {
    if (!hexGroup.test(p)) return false;
  }
  return true;
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

