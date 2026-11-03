import {
  ExclusaoVinculadaError,
  impedirExclusaoComVinculos,
  isExclusaoVinculadaError,
  isPrismaForeignKeyError,
  MENSAGEM_EXCLUSAO_VINCULADA,
} from './exclusaoVinculo';

describe('impedirExclusaoComVinculos', () => {
  it('permite excluir quando não há vínculo', async () => {
    await expect(impedirExclusaoComVinculos([
      { rotulo: 'contrato(s)', contar: async () => 0 },
    ])).resolves.toBeUndefined();
  });

  it('recusa excluir e cita a quantidade vinculada', async () => {
    await expect(impedirExclusaoComVinculos([
      { rotulo: 'contrato(s)', contar: async () => 2 },
      { rotulo: 'conta(s) a pagar', contar: async () => 0 },
    ])).rejects.toBeInstanceOf(ExclusaoVinculadaError);

    try {
      await impedirExclusaoComVinculos([
        { rotulo: 'contrato(s)', contar: async () => 2 },
      ]);
    } catch (error) {
      expect(isExclusaoVinculadaError(error)).toBe(true);
      expect((error as Error).message).toContain('2 contrato(s)');
    }
  });

  it('reconhece a chave estrangeira do Prisma', () => {
    expect(isPrismaForeignKeyError({ code: 'P2003' })).toBe(true);
    expect(isPrismaForeignKeyError({ code: 'P2002' })).toBe(false);
    expect(MENSAGEM_EXCLUSAO_VINCULADA).toContain('vinculados');
  });
});
