jest.mock('../../../db/prisma', () => ({
  prisma: {
    nfse_config: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));

import { prisma } from '../../../db/prisma';
import { NFSeConfigService } from './index';

const config = prisma.nfse_config;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('NFSeConfigService', () => {
  it('consulta a configuração da empresa', async () => {
    (config.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(NFSeConfigService.get(10)).resolves.toBeNull();
    expect(JSON.stringify((config.findFirst as jest.Mock).mock.calls[0][0].where)).toContain('"empresa_id":10');
  });

  it('cria a configuração na empresa quando ainda não existe', async () => {
    (config.findFirst as jest.Mock).mockResolvedValue(null);
    (config.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 1, ...data }));
    await NFSeConfigService.update({ serie_nf: '1' }, 10);
    const data = (config.create as jest.Mock).mock.calls[0][0].data;
    expect(data.empresa_id).toBe(10);
    expect(data.serie_nf).toBe('1');
    expect(data.asaas_api_key).toBeNull();
  });

  it('altera só a série já cadastrada', async () => {
    (config.findFirst as jest.Mock).mockResolvedValue({ id: 4, empresa_id: 10 });
    (config.update as jest.Mock).mockResolvedValue({ id: 4 });
    await NFSeConfigService.update({ serie_nf: '2' }, 10);
    const data = (config.update as jest.Mock).mock.calls[0][0].data;
    expect(data.serie_nf).toBe('2');
    expect(data.asaas_api_key).toBeUndefined();
    expect(config.create).not.toHaveBeenCalled();
  });
});
