jest.mock('../../../db/prisma', () => ({
  prisma: {
    assinatura_digital_providers: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../../db/prisma';
import { AssinaturaDigitalProviderService } from './index';

const providers = prisma.assinatura_digital_providers;
const linha = {
  id: 2,
  provider: 'zapsign',
  empresa_id: 10,
  habilitado: true,
  api_key: 'chave',
  account_id: null,
  dias_expiracao_padrao: 7,
  configuracao_extra: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AssinaturaDigitalProviderService', () => {
  it('lista a empresa e o cadastro global, e aceita vazio', async () => {
    (providers.findMany as jest.Mock).mockResolvedValue([]);
    await expect(AssinaturaDigitalProviderService.list(10)).resolves.toEqual([]);
    expect(providers.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: [{ empresa_id: 10 }, { empresa_id: null }] },
    }));
  });

  it('altera só a habilitação e não troca a chave', async () => {
    (providers.findFirst as jest.Mock).mockResolvedValue(linha);
    (providers.update as jest.Mock).mockResolvedValue({ ...linha, habilitado: false });
    (providers.findUnique as jest.Mock).mockResolvedValue({ ...linha, habilitado: false });
    await AssinaturaDigitalProviderService.update('zapsign', { habilitado: false, empresa_id: 10 });
    const data = (providers.update as jest.Mock).mock.calls[0][0].data;
    expect(data.habilitado).toBe(false);
    expect(data.api_key).toBeUndefined();
  });

  it('não grava provider inexistente', async () => {
    (providers.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(AssinaturaDigitalProviderService.update('assinafy', { habilitado: true, empresa_id: 10 })).rejects.toThrow('não encontrado');
    expect(providers.update).not.toHaveBeenCalled();
  });
});
