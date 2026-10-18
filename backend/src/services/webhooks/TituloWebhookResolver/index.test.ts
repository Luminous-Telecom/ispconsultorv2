jest.mock('../../../models/cadastros/Banco', () => ({
  Banco: { findOne: jest.fn() },
}));

jest.mock('../../../models/financeiro/Titulo', () => ({
  Titulo: { findOne: jest.fn() },
}));

import { Banco } from '../../../models/cadastros/Banco';
import { Titulo } from '../../../models/financeiro/Titulo';
import { TituloWebhookResolver } from './index';

const findOne = Banco.findOne as jest.Mock;
const tituloFindOne = Titulo.findOne as jest.Mock;

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

describe('TituloWebhookResolver.findByChargeId', () => {
  it('converte charge_id numérico da Efi para string no where', async () => {
    findOne.mockResolvedValue({ id: 1, tipo_banco: 'efi' });
    tituloFindOne.mockResolvedValue({ id: 10, charge_id: '45049929', banco: null });

    await TituloWebhookResolver.findByChargeId(45049929, { empresaIdentifier: '1' });

    expect(tituloFindOne).toHaveBeenCalledWith({
      where: { charge_id: '45049929', banco_id: 1 },
      include: [{ model: Banco, as: 'banco' }],
    });
  });
});
