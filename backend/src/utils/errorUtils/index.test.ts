import Joi from 'joi';
import { getErrorMessage, getErrorName, isError, isJoiError, isRpkiClientError, RpkiClientError } from './index';

describe('errorUtils', () => {
  it('extrai mensagem de Error, string, Joi e desconhecido', () => {
    expect(getErrorMessage(new Error('falhou'))).toBe('falhou');
    expect(getErrorMessage('texto')).toBe('texto');
    expect(getErrorMessage(null)).toBe('Erro desconhecido');

    const { error } = Joi.object({ nome: Joi.string().required() }).validate({});
    expect(isJoiError(error)).toBe(true);
    expect(getErrorMessage(error)).toContain('nome');
  });

  it('identifica RpkiClientError sem tratar objeto comum como Error', () => {
    const erro = new RpkiClientError('CA ausente');
    expect(isRpkiClientError(erro)).toBe(true);
    expect(getErrorName(erro)).toBe('RpkiClientError');
    expect(isError({ message: 'não é Error' })).toBe(false);
  });
});
