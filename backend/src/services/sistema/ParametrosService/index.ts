import type { Prisma, sistema_parametros } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { cache } from '../../../utils/cache';

const CACHE_TTL_MS = 600_000;

const DEFAULTS = {
  validar_cpf_cnpj: true,
  validar_cep: false,
  titulos_vence_sabado: false,
  titulos_vence_domingo: false,
  central_assinante_metodo_login: 'cnpj',
  dias_suspender_atraso: null as number | null,
};

function cacheKey(empresaId: number | null): string {
  return `parametros:config:${empresaId ?? 'global'}`;
}

export class ParametrosService {
  static async get(empresaId: number | null): Promise<sistema_parametros> {
    const key = cacheKey(empresaId);
    const cached = cache.get<sistema_parametros>(key);
    if (cached) return cached;

    let row = await prisma.sistema_parametros.findFirst({ where: { empresa_id: empresaId } });
    if (!row) {
      row = await prisma.sistema_parametros.create({
        data: { ...DEFAULTS, empresa_id: empresaId },
      });
    }
    cache.set(key, row, CACHE_TTL_MS);
    return row;
  }

  static async update(dados: Prisma.sistema_parametrosUncheckedUpdateInput, empresaId: number | null): Promise<sistema_parametros> {
    let row = await prisma.sistema_parametros.findFirst({ where: { empresa_id: empresaId } });
    if (!row) {
      row = await prisma.sistema_parametros.create({
        data: { ...DEFAULTS, ...dados, empresa_id: empresaId } as Prisma.sistema_parametrosUncheckedCreateInput,
      });
    } else {
      row = await prisma.sistema_parametros.update({
        where: { id: row.id },
        data: { ...dados, empresa_id: empresaId },
      });
    }
    cache.delete(cacheKey(empresaId));
    return row;
  }
}
