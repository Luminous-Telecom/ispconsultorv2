jest.mock('../../db/prisma', () => ({
  prisma: {
    comunicacao_servidores_whatsapp: { findFirst: jest.fn() },
    comunicacao_servidores_email: { findFirst: jest.fn() },
  },
}));

import { prisma } from '../../db/prisma';
import { resolverServidorEmailCobranca, resolverServidorWhatsAppCobranca } from './resolverServidorCobranca';

const whatsapp = prisma.comunicacao_servidores_whatsapp.findFirst as jest.Mock;
const email = prisma.comunicacao_servidores_email.findFirst as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('resolverServidorCobranca', () => {
  it('usa o servidor informado no banco quando está ativo', async () => {
    whatsapp.mockResolvedValueOnce({ id: 8, padrao: false });
    await expect(resolverServidorWhatsAppCobranca(10, 8)).resolves.toEqual({ id: 8, padrao: false });
    expect(whatsapp).toHaveBeenCalledWith(expect.objectContaining({
      where: { ativo: true, empresa_id: 10, id: 8 },
    }));
  });

  it('cai no padrão quando o banco não escolhe servidor', async () => {
    email.mockResolvedValueOnce({ id: 3, padrao: true });
    await expect(resolverServidorEmailCobranca(10, null)).resolves.toEqual({ id: 3, padrao: true });
    expect(email).toHaveBeenCalledWith(expect.objectContaining({
      where: { ativo: true, empresa_id: 10, padrao: true },
    }));
  });

  it('cai no primeiro ativo quando não há padrão', async () => {
    whatsapp.mockResolvedValueOnce(null);
    whatsapp.mockResolvedValueOnce({ id: 2, padrao: false });
    await expect(resolverServidorWhatsAppCobranca(10)).resolves.toEqual({ id: 2, padrao: false });
    expect(whatsapp).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { ativo: true, empresa_id: 10 },
    }));
  });

  it('não busca servidor sem empresa', async () => {
    await expect(resolverServidorWhatsAppCobranca(null, 1)).resolves.toBeNull();
    expect(whatsapp).not.toHaveBeenCalled();
  });
});
