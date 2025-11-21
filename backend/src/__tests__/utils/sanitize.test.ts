/**
 * Testes para utilitários de sanitização
 */
import { sanitizeString, sanitizeEmail, sanitizeNumber, sanitizeCnpjCpf } from '../../utils/sanitize';

describe('sanitize', () => {
  describe('sanitizeString', () => {
    it('deve remover tags HTML', () => {
      const input = '<script>alert("XSS")</script>Teste';
      const output = sanitizeString(input);
      // sanitizeString remove tags HTML mas mantém e escapa o conteúdo interno
      // Tags <script> são removidas, conteúdo interno é escapado
      expect(output).not.toContain('<script>');
      expect(output).not.toContain('</script>');
      expect(output).toContain('Teste');
    });

    it('deve remover atributos de eventos', () => {
      const input = '<img src=x onerror=alert(1)>Teste';
      const output = sanitizeString(input);
      expect(output).toBe('Teste');
      expect(output).not.toContain('onerror');
    });

    it('deve escapar caracteres especiais', () => {
      const input = 'Teste & < > " \' /';
      const output = sanitizeString(input);
      // sanitizeString remove HTML, então < e > são removidos
      // Apenas & e " são escapados quando presentes
      expect(output).toContain('&amp;');
      expect(output).toContain('&quot;');
      expect(output).not.toContain('<');
      expect(output).not.toContain('>');
    });

    it('deve retornar string vazia para null/undefined', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });

    it('deve permitir HTML quando allowHtml=true', () => {
      const input = '<p>Texto válido</p><script>alert(1)</script>';
      const output = sanitizeString(input, true);
      expect(output).toContain('<p>');
      expect(output).not.toContain('<script>');
    });
  });

  describe('sanitizeEmail', () => {
    it('deve retornar email válido limpo', () => {
      const input = '  teste@exemplo.com  ';
      const output = sanitizeEmail(input);
      expect(output).toBe('teste@exemplo.com');
    });

    it('deve retornar string vazia para email inválido', () => {
      expect(sanitizeEmail('email-invalido')).toBe('');
      expect(sanitizeEmail(null)).toBe('');
    });
  });

  describe('sanitizeNumber', () => {
    it('deve retornar número válido', () => {
      expect(sanitizeNumber('123.45')).toBe(123.45);
      expect(sanitizeNumber('100')).toBe(100);
    });

    it('deve retornar null para valores inválidos', () => {
      expect(sanitizeNumber('abc')).toBeNull();
      expect(sanitizeNumber(null)).toBeNull();
      expect(sanitizeNumber(undefined)).toBeNull();
    });
  });

  describe('sanitizeCnpjCpf', () => {
    it('deve remover caracteres especiais de CNPJ/CPF', () => {
      const cpf = '123.456.789-00';
      const cnpj = '12.345.678/0001-90';
      expect(sanitizeCnpjCpf(cpf)).toBe('12345678900');
      expect(sanitizeCnpjCpf(cnpj)).toBe('12345678000190');
    });

    it('deve retornar string vazia para valores inválidos', () => {
      expect(sanitizeCnpjCpf(null)).toBe('');
      expect(sanitizeCnpjCpf('')).toBe('');
    });
  });
});

