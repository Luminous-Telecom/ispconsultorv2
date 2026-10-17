jest.mock('axios', () => require('../test/httpMock').createAxiosMockModule());

import { CepService } from './cepService';
import { getHttp, ok, resetHttp } from '../test/httpMock';

describe('CepService', () => {
  beforeEach(() => {
    resetHttp();
  });

  it('recusa CEP incompleto antes de consultar', async () => {
    await expect(CepService.buscarCep('123')).rejects.toBeTruthy();
    await expect(CepService.buscarCepApi('12.345')).rejects.toBeTruthy();
    expect(getHttp().get).not.toHaveBeenCalled();
  });

  it('consulta o CEP só com os oito dígitos', async () => {
    getHttp().get.mockResolvedValue(ok({
      cep: '01310-100',
      logradouro: 'Avenida Paulista',
      bairro: 'Bela Vista',
      localidade: 'Sao Paulo',
      uf: 'SP',
    }));
    const result = await CepService.buscarCepApi('01310-100');
    expect(String(getHttp().get.mock.calls[0][0])).toBe('/clientes/buscar-cep/01310100');
    expect(result.localidade).toBe('Sao Paulo');
  });

  it('formata e valida o CEP', () => {
    expect(CepService.formatarCep('01310100')).toBe('01310-100');
    expect(CepService.validarCep('01310-100')).toBe(true);
    expect(CepService.validarCep('123')).toBe(false);
  });
});
