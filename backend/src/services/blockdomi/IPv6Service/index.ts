import type { Prisma } from '@prisma/client';
import { prisma } from '../../../db/prisma';
import { isValidIPv6 } from '../../../utils/sanitize';
import { NumeroSeiAnatelBlockdomiService } from '../NumeroSeiAnatelBlockdomiService';
import { VersaoBlockdomiService } from '../VersaoBlockdomiService';
import {
  dateOnlyString,
  findBlockdomiById,
  listBlockdomi,
  normalizeBlockdomiWrite,
  plainBlockdomi,
  registrarOperacaoDelete,
} from '../blockdomiPrisma';

const TABELA = 'blockdomi_ipv6' as const;

export interface ListIPv6Filters {
  page?: number;
  limit?: number;
  search?: string;
  searchField?: string;
  ativo?: boolean;
  sortColumn?: string;
  sortDirection?: string;
}

type IPv6Write = {
  ip?: string;
  descricao?: string | null;
  nome_oficio?: string | null;
  data_inicio_bloqueio?: string | Date | null;
  data_fim_bloqueio?: string | Date | null;
  link_oficio_anatel?: string | null;
  link_oficio_justica?: string | null;
  link_planilha_dominios?: string | null;
  ativo?: boolean;
  versao_id?: number | null;
  empresa_id?: number | null;
  numero_sei_anatel_id?: number | null;
  numero_sei_anatel?: string | null;
};

function metadataDate(value: string | null | undefined): Date | null {
  if (value == null || String(value).trim() === '') return null;
  return new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
}

export class IPv6Service {
  static async list(filters: ListIPv6Filters) {
    return listBlockdomi({
      tabela: TABELA,
      primaryField: 'ip',
      filters,
      logContext: 'IPv6Service.list',
    });
  }

  static async getById(id: string | number) {
    return findBlockdomiById(TABELA, id);
  }

  static async findByIp(ip: string) {
    const row = await prisma.blockdomi_ipv6.findFirst({ where: { ip } });
    return row ? plainBlockdomi(row, false) : null;
  }

  static async findByIps(ips: string[]): Promise<Set<string>> {
    if (ips.length === 0) return new Set();
    const unique = [...new Set(ips)];
    const found = await prisma.blockdomi_ipv6.findMany({
      where: { ip: { in: unique } },
      select: { ip: true },
    });
    return new Set(found.map((row) => row.ip));
  }

  static async findByIpsWithData(ips: string[]) {
    if (ips.length === 0) return new Map<string, {
      id: number;
      data_fim_bloqueio: string | null;
      link_oficio_anatel: string | null;
      link_oficio_justica: string | null;
      link_planilha_dominios: string | null;
      numero_sei_anatel: string | null;
    }>();
    const unique = [...new Set(ips)];
    const found = await prisma.blockdomi_ipv6.findMany({
      where: { ip: { in: unique } },
      select: {
        id: true,
        ip: true,
        data_fim_bloqueio: true,
        link_oficio_anatel: true,
        link_oficio_justica: true,
        link_planilha_dominios: true,
        blockdomi_numeros_sei_anatel: { select: { numero: true } },
      },
    });
    const map = new Map<string, {
      id: number;
      data_fim_bloqueio: string | null;
      link_oficio_anatel: string | null;
      link_oficio_justica: string | null;
      link_planilha_dominios: string | null;
      numero_sei_anatel: string | null;
    }>();
    for (const row of found) {
      map.set(row.ip, {
        id: row.id,
        data_fim_bloqueio: dateOnlyString(row.data_fim_bloqueio),
        link_oficio_anatel: row.link_oficio_anatel,
        link_oficio_justica: row.link_oficio_justica,
        link_planilha_dominios: row.link_planilha_dominios,
        numero_sei_anatel: row.blockdomi_numeros_sei_anatel?.numero ?? null,
      });
    }
    return map;
  }

  static async bulkCreate(
    items: string[],
    metadata: {
      nome_oficio?: string | null;
      data_inicio_bloqueio?: string | null;
      data_fim_bloqueio?: string | null;
      link_oficio_anatel?: string | null;
      link_oficio_justica?: string | null;
      link_planilha_dominios?: string | null;
      numero_sei_anatel?: string | null;
      empresa_id?: number | null;
      getVersoesForNewRecords?: (count: number) => Promise<Array<{ id: number; numero: string }>>;
      versaoId?: number;
    }
  ) {
    const valid = items.filter((ip) => isValidIPv6(ip));
    const existingMap = valid.length > 0 ? await this.findByIpsWithData(valid) : new Map();
    const toCreate: Prisma.blockdomi_ipv6CreateManyInput[] = [];
    const toUpdate: Array<{ id: number }> = [];
    const errors: string[] = [];
    const seen = new Set<string>();
    const newDataFim = metadata.data_fim_bloqueio ?? null;
    const seiIdNovo = await NumeroSeiAnatelBlockdomiService.obterOuCriarPorNumero(metadata.numero_sei_anatel ?? null);

    for (const ip of items) {
      if (!isValidIPv6(ip)) {
        errors.push(`${ip}: IPv6 inválido`);
        continue;
      }
      if (seen.has(ip)) continue;
      seen.add(ip);
      const existing = existingMap.get(ip);
      if (existing) {
        const dataFimMudou = newDataFim !== (existing.data_fim_bloqueio ?? null);
        const hasNoUrls = !(existing.link_oficio_anatel?.trim() || existing.link_oficio_justica?.trim() || existing.link_planilha_dominios?.trim());
        const hasUrlsToAdd = !!(metadata.link_oficio_anatel?.trim() || metadata.link_oficio_justica?.trim() || metadata.link_planilha_dominios?.trim());
        const hasNoSei = !(existing.numero_sei_anatel?.trim());
        const hasSeiToAdd = !!(metadata.numero_sei_anatel?.trim());
        if (dataFimMudou || (hasNoUrls && hasUrlsToAdd) || (hasNoSei && hasSeiToAdd)) {
          toUpdate.push({ id: existing.id });
        }
        continue;
      }
      toCreate.push({
        ip,
        descricao: null,
        nome_oficio: metadata.nome_oficio ?? null,
        data_inicio_bloqueio: metadataDate(metadata.data_inicio_bloqueio),
        data_fim_bloqueio: metadataDate(metadata.data_fim_bloqueio),
        link_oficio_anatel: metadata.link_oficio_anatel ?? null,
        link_oficio_justica: metadata.link_oficio_justica ?? null,
        link_planilha_dominios: metadata.link_planilha_dominios ?? null,
        numero_sei_anatel_id: seiIdNovo,
        empresa_id: metadata.empresa_id ?? null,
        ativo: true,
      });
    }

    let primeiraVersao: string | undefined;
    let versaoId: number | null = metadata.versaoId ?? null;
    const metaEmpresaId = metadata.empresa_id ?? null;
    if (toCreate.length > 0 || toUpdate.length > 0) {
      if (versaoId == null && !metadata.getVersoesForNewRecords) {
        const versao = await VersaoBlockdomiService.obterProximaVersao('ipv6', undefined, metaEmpresaId);
        versaoId = versao.id;
        primeiraVersao = versao.numero;
      } else if (metadata.getVersoesForNewRecords && toCreate.length > 0) {
        const versoes = await metadata.getVersoesForNewRecords(toCreate.length);
        primeiraVersao = versoes[0]?.numero;
      }
      if (toUpdate.length > 0 && versaoId == null) {
        const versao = await VersaoBlockdomiService.obterProximaVersao('ipv6', undefined, metaEmpresaId);
        versaoId = versao.id;
        if (primeiraVersao == null) primeiraVersao = versao.numero;
      }
    }

    if (toCreate.length > 0) {
      if (versaoId != null) {
        toCreate.forEach((rec) => { rec.versao_id = versaoId; });
      } else if (metadata.getVersoesForNewRecords) {
        const versoes = await metadata.getVersoesForNewRecords(toCreate.length);
        primeiraVersao = primeiraVersao ?? versoes[0]?.numero;
        toCreate.forEach((rec, i) => { rec.versao_id = versoes[i]?.id ?? null; });
      }
    }

    const BATCH = 500;
    let created = 0;
    for (let i = 0; i < toCreate.length; i += BATCH) {
      const result = await prisma.blockdomi_ipv6.createMany({ data: toCreate.slice(i, i + BATCH) });
      created += result.count;
    }

    let createdIds: number[] = [];
    if (toCreate.length > 0) {
      const registros = await prisma.blockdomi_ipv6.findMany({
        where: { ip: { in: toCreate.map((c) => c.ip) } },
        select: { id: true },
      });
      createdIds = registros.map((row) => row.id);
    }

    let updated = 0;
    const updatedIds = toUpdate.map((u) => u.id);
    if (toUpdate.length > 0 && versaoId != null) {
      await prisma.blockdomi_ipv6.updateMany({
        where: { id: { in: updatedIds } },
        data: {
          nome_oficio: metadata.nome_oficio ?? null,
          data_inicio_bloqueio: metadataDate(metadata.data_inicio_bloqueio),
          data_fim_bloqueio: metadataDate(newDataFim),
          link_oficio_anatel: metadata.link_oficio_anatel ?? null,
          link_oficio_justica: metadata.link_oficio_justica ?? null,
          link_planilha_dominios: metadata.link_planilha_dominios ?? null,
          numero_sei_anatel_id: seiIdNovo,
          versao_id: versaoId,
        },
      });
      updated = toUpdate.length;
    }

    const skipped = items.length - toCreate.length - toUpdate.length - errors.length;
    return { created, updated, skipped, errors, primeiraVersao, createdIds, updatedIds };
  }

  static async create(dadosIPv6: IPv6Write) {
    const dados: Record<string, unknown> = { ...dadosIPv6 };
    if (dados.descricao === undefined) dados.descricao = null;
    const empresaId = (dados.empresa_id as number | null | undefined) ?? null;
    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao('ipv6', undefined, empresaId);
    dados.versao_id = versaoId;
    if ('numero_sei_anatel' in dados) {
      const raw = dados.numero_sei_anatel;
      delete dados.numero_sei_anatel;
      dados.numero_sei_anatel_id = await NumeroSeiAnatelBlockdomiService.obterOuCriarPorNumero(raw as string | null | undefined);
    }
    const created = await prisma.blockdomi_ipv6.create({
      data: normalizeBlockdomiWrite(dados) as Prisma.blockdomi_ipv6UncheckedCreateInput,
    });
    const reloaded = await findBlockdomiById(TABELA, created.id);
    if (!reloaded) throw new Error('IPv6 não encontrado');
    return reloaded;
  }

  static async update(id: string | number, dadosIPv6: IPv6Write) {
    const numericId = Number(id);
    const existing = await prisma.blockdomi_ipv6.findUnique({ where: { id: numericId } });
    if (!existing) throw new Error('IPv6 não encontrado');
    const allowedFields = [
      'ip', 'descricao', 'nome_oficio', 'data_inicio_bloqueio', 'data_fim_bloqueio',
      'link_oficio_anatel', 'link_oficio_justica', 'link_planilha_dominios', 'ativo',
    ];
    const updateData: Record<string, unknown> = {};
    for (const key of Object.keys(dadosIPv6)) {
      if (allowedFields.includes(key) && dadosIPv6[key as keyof IPv6Write] !== undefined) {
        updateData[key] = dadosIPv6[key as keyof IPv6Write];
      }
    }
    if (dadosIPv6.numero_sei_anatel !== undefined) {
      updateData.numero_sei_anatel_id = await NumeroSeiAnatelBlockdomiService.obterOuCriarPorNumero(dadosIPv6.numero_sei_anatel);
    }
    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao('ipv6', undefined, existing.empresa_id ?? null);
    updateData.versao_id = versaoId;
    await prisma.blockdomi_ipv6.update({
      where: { id: numericId },
      data: normalizeBlockdomiWrite(updateData) as Prisma.blockdomi_ipv6UncheckedUpdateInput,
    });
    const reloaded = await findBlockdomiById(TABELA, numericId);
    if (!reloaded) throw new Error('IPv6 não encontrado');
    return reloaded;
  }

  static async delete(id: string | number) {
    const numericId = Number(id);
    const ipv6 = await prisma.blockdomi_ipv6.findUnique({ where: { id: numericId } });
    if (!ipv6) throw new Error('IPv6 não encontrado');
    const { id: versaoId } = await VersaoBlockdomiService.obterProximaVersao('ipv6_delete', undefined, ipv6.empresa_id ?? null);
    await prisma.blockdomi_ipv6.delete({ where: { id: numericId } });
    await registrarOperacaoDelete('ipv6_delete', versaoId, 1, [numericId], ipv6.empresa_id);
    return plainBlockdomi(ipv6, false);
  }

  static async bulkDelete(ids: (string | number)[]) {
    if (ids.length === 0) return { deleted: 0, versao: '', versaoId: 0 };
    const idsNum = ids.map((id) => Number(id)).filter((n) => !Number.isNaN(n));
    if (idsNum.length === 0) return { deleted: 0, versao: '', versaoId: 0 };
    const { id: versaoId, numero: versao } = await VersaoBlockdomiService.obterProximaVersao('ipv6_delete', undefined, null);
    const result = await prisma.blockdomi_ipv6.deleteMany({ where: { id: { in: idsNum } } });
    await registrarOperacaoDelete('ipv6_delete', versaoId, result.count, idsNum);
    return { deleted: result.count, versao, versaoId };
  }
}
