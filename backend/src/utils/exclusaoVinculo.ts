export const MENSAGEM_EXCLUSAO_VINCULADA =
  'Não é possível excluir: existem registros vinculados a este cadastro.';

export class ExclusaoVinculadaError extends Error {
  readonly code = 'EXCLUSAO_VINCULADA';

  constructor(vinculos: Array<{ rotulo: string; quantidade: number }>) {
    const partes = vinculos.map((item) => `${item.quantidade} ${item.rotulo}`);
    super(`Não é possível excluir: existem ${partes.join(', ')} vinculado(s) a este cadastro.`);
    this.name = 'ExclusaoVinculadaError';
  }
}

export function isExclusaoVinculadaError(error: unknown): error is ExclusaoVinculadaError {
  return error instanceof ExclusaoVinculadaError;
}

export function isPrismaForeignKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2003';
}

/**
 * Padrão de exclusão de cadastro vinculativo.
 * Cada verificação conta registros que apontam para o cadastro.
 * Se houver algum, a exclusão é recusada.
 */
export async function impedirExclusaoComVinculos(
  verificacoes: Array<{ rotulo: string; contar: () => Promise<number> }>
): Promise<void> {
  const encontrados: Array<{ rotulo: string; quantidade: number }> = [];

  for (const verificacao of verificacoes) {
    const quantidade = await verificacao.contar();
    if (quantidade > 0) {
      encontrados.push({ rotulo: verificacao.rotulo, quantidade });
    }
  }

  if (encontrados.length > 0) {
    throw new ExclusaoVinculadaError(encontrados);
  }
}
