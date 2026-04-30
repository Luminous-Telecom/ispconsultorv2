import { NumeroSeiAnatelBlockdomi } from '../../../models/blockdomi/NumeroSeiAnatelBlockdomi';

export class NumeroSeiAnatelBlockdomiService {
  static normalize(num: string | null | undefined): string | null {
    const t = (num ?? '').trim();
    return t === '' ? null : t;
  }

  /** Retorna o id da linha única do número SEI, criando o registro se ainda não existir. */
  static async obterOuCriarPorNumero(num: string | null | undefined): Promise<number | null> {
    const n = NumeroSeiAnatelBlockdomiService.normalize(num);
    if (!n) return null;
    const [row] = await NumeroSeiAnatelBlockdomi.findOrCreate({
      where: { numero: n },
      defaults: { numero: n }
    });
    return row.id as number;
  }
}
