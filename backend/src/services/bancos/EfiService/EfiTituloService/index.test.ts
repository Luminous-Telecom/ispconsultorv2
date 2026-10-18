import axios from 'axios';
import { EfiTituloService } from './index';

jest.mock('axios');
jest.mock('../../../financeiro/TituloService', () => ({
  TituloService: { getById: jest.fn() },
}));

const axiosPut = axios.put as jest.Mock;

describe('EfiTituloService.liquidarTitulo', () => {
  const titulo = { id: 1, charge_id: '45049929' } as never;
  const banco = { sandbox: true } as never;
  const token = 'token';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('não chama /settle quando a cobrança já está settled', async () => {
    jest.spyOn(EfiTituloService, 'consultarStatus').mockResolvedValue({
      success: true,
      status: 'settled',
      data: { code: 200, data: { status: 'settled' } },
    });

    const result = await EfiTituloService.liquidarTitulo(titulo, banco, token);

    expect(result.success).toBe(true);
    expect(result.message).toMatch(/já estava liquidada/i);
    expect(axiosPut).not.toHaveBeenCalled();
  });
});
