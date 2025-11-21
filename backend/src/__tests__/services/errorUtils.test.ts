/**
 * Testes para errorUtils
 */
import { isJoiError, isError, getErrorMessage, getErrorStack, getErrorName } from '../../utils/errorUtils';
import { ValidationError as JoiValidationError } from 'joi';

describe('errorUtils', () => {
  describe('isError', () => {
    it('deve retornar true para instância de Error', () => {
      const error = new Error('Teste');
      expect(isError(error)).toBe(true);
    });

    it('deve retornar false para valores não-Error', () => {
      expect(isError('string')).toBe(false);
      expect(isError(123)).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
      expect(isError({})).toBe(false);
    });
  });

  describe('isJoiError', () => {
    it('deve retornar true para erro de validação Joi', () => {
      const error = new JoiValidationError('Erro de validação', [], {});
      (error as unknown as { isJoi: boolean }).isJoi = true;
      expect(isJoiError(error)).toBe(true);
    });

    it('deve retornar false para erro comum', () => {
      const error = new Error('Erro comum');
      expect(isJoiError(error)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('deve retornar mensagem de Error', () => {
      const error = new Error('Mensagem de erro');
      expect(getErrorMessage(error)).toBe('Mensagem de erro');
    });

    it('deve retornar mensagem de string', () => {
      expect(getErrorMessage('Erro em string')).toBe('Erro em string');
    });

    it('deve retornar mensagem padrão para erro desconhecido', () => {
      expect(getErrorMessage(null)).toBe('Erro desconhecido');
      expect(getErrorMessage(undefined)).toBe('Erro desconhecido');
      expect(getErrorMessage(123)).toBe('Erro desconhecido');
    });
  });

  describe('getErrorStack', () => {
    it('deve retornar stack trace de Error', () => {
      const error = new Error('Teste');
      const stack = getErrorStack(error);
      expect(stack).toBeDefined();
      expect(typeof stack).toBe('string');
    });

    it('deve retornar undefined para valores não-Error', () => {
      expect(getErrorStack('string')).toBeUndefined();
      expect(getErrorStack(null)).toBeUndefined();
    });
  });

  describe('getErrorName', () => {
    it('deve retornar nome de Error', () => {
      const error = new Error('Teste');
      expect(getErrorName(error)).toBe('Error');
    });

    it('deve retornar undefined para valores não-Error', () => {
      expect(getErrorName('string')).toBeUndefined();
      expect(getErrorName(null)).toBeUndefined();
    });
  });
});

