jest.mock('../../../models/cadastros/Banco', () => ({
  Banco: { findOne: jest.fn() },
}));

jest.mock('../../../models/financeiro/Titulo', () => ({
  Titulo: { findOne: jest.fn() },
}));

import { Banco } from '../../../models/cadastros/Banco';
import { TituloWebhookResolver } from './index';

const findOne = Banco.findOne as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TituloWebhookResolver.resolveBancoFromWebhookIdentifier', () => {
  it('acha o banco Efi pelo ID numérico na URL', async () => {
    findOne.mockResolvedValue({ id: 12, tipo_banco: 'efi' });

    const banco = await TituloWebhookResolver.resolveBancoFromWebhookIdentifier('12', 'efi');

    expect(banco?.id).toBe(12);
    expect(findOne).toHaveBeenCalledWith({
      where: { id: 12, ativo: true, tipo_banco: 'efi' },
    });
  });

  it('acha o banco Efi pelo identificador_conta (payee_code)', async () => {
    const payee = '56108d6083041be4cb6573d088ffe4aa';
    findOne.mockResolvedValue({ id: 3, identificador_conta: payee, tipo_banco: 'efi' });

    const banco = await TituloWebhookResolver.resolveBancoFromWebhookIdentifier(payee, 'efi');

    expect(banco?.id).toBe(3);
    expect(findOne).toHaveBeenCalledWith({
      where: { identificador_conta: payee, ativo: true, tipo_banco: 'efi' },
    });
  });

  it('sem identificador não busca banco', async () => {
    await expect(
      TituloWebhookResolver.resolveBancoFromWebhookIdentifier(undefined, 'efi')
    ).resolves.toBeNull();
    expect(findOne).not.toHaveBeenCalled();
  });
});
