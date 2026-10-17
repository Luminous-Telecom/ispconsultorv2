import { prisma } from '../../../db/prisma';

export class NumeroSeiAnatelBlockdomiService {
  static normalize(num: string | null | undefined): string | null {
    const t = (num ?? '').trim();
    return t === '' ? null : t;
  }

  /** Retorna o id da linha única do número SEI, criando o registro se ainda não existir. */
  static async obterOuCriarPorNumero(num: string | null | undefined): Promise<number | null> {
    const n = NumeroSeiAnatelBlockdomiService.normalize(num);
    if (!n) return null;
    const row = await prisma.blockdomi_numeros_sei_anatel.upsert({
      where: { numero: n },
      create: { numero: n },
      update: {},
    });
    return row.id;
  }
}
