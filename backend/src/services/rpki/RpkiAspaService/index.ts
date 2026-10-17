import { prisma } from '../../../db/prisma';
import { SistemaLogOperacionalService } from '../../sistema/SistemaLogOperacionalService';
import { RpkiClientError } from '../../../utils/errorUtils';
import { syncKrillAspasForCa, syncAspasFromKrillToDb } from '../KrillSyncService';

function parseAsn(raw: string): number {
  const cleaned = String(raw).trim().toUpperCase().replace(/^AS/, '');
  if (!/^\d+$/.test(cleaned)) {
    throw new RpkiClientError('ASN inválido. Use apenas números (ex.: 64512).');
  }
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0 || n > 4294967295) {
    throw new RpkiClientError('ASN inválido. Deve ser um número entre 0 e 4294967295.');
  }
  return n;
}

function parseProviders(raw: string): number[] {
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) {
    throw new RpkiClientError('Pelo menos um provedor ASN é obrigatório.');
  }
  return parts.map((p) => parseAsn(p));
}

interface CreateAspaInput {
  caId: number;
  empresaId: number | null;
  customerAsn: string;
  providers: string;
}

function plainAspa<T extends { customer_asn: bigint; providers_json: string }>(row: T) {
  let providers: unknown = [];
  try {
    providers = JSON.parse(row.providers_json);
  } catch {
    providers = [];
  }
  return { ...row, customer_asn: row.customer_asn.toString(), providers_json: providers };
}

export class RpkiAspaService {
  static async listByCa(caId: number) {
    await syncAspasFromKrillToDb(caId);
    const rows = await prisma.rpki_aspas.findMany({
      where: { ca_id: caId, status: 'active' },
      orderBy: { id: 'desc' },
    });
    return rows.map(plainAspa);
  }

  static async create(input: CreateAspaInput) {
    const customerAsn = String(parseAsn(input.customerAsn));
    const providerNums = parseProviders(input.providers);
    const providersJson = providerNums.map(String);

    const duplicate = await prisma.rpki_aspas.findFirst({
      where: {
        ca_id: input.caId,
        customer_asn: BigInt(customerAsn),
        status: { not: 'revoked' },
      },
    });
    if (duplicate) {
      throw new RpkiClientError('Já existe um ASPA ativo para este Customer ASN nesta CA.');
    }

    const now = new Date();
    const notAfter = new Date(now);
    notAfter.setFullYear(now.getFullYear() + 1);

    const row = plainAspa(await prisma.rpki_aspas.create({
      data: {
        empresa_id: input.empresaId,
        ca_id: input.caId,
        customer_asn: BigInt(customerAsn),
        providers_json: JSON.stringify(providersJson),
        afi: 'both',
        status: 'active',
        not_before: now,
        not_after: notAfter,
        revoked_at: null,
      },
    }));

    SistemaLogOperacionalService.registrarRpkiActivity({
      empresaId: input.empresaId,
      caId: input.caId,
      objectType: 'aspa',
      objectId: row.id,
      action: 'create',
      details: JSON.stringify({ customer_asn: row.customer_asn, providers: providersJson }),
    });

    await syncKrillAspasForCa(input.caId, 'aspa');
    return row;
  }

  static async revoke(caId: number, aspaId: number) {
    const found = await prisma.rpki_aspas.findFirst({ where: { id: aspaId, ca_id: caId } });
    if (!found) throw new RpkiClientError('ASPA não encontrado para esta CA.');
    const current = plainAspa(found);
    if (current.status === 'revoked') return current;

    const row = plainAspa(await prisma.rpki_aspas.update({
      where: { id: aspaId },
      data: { status: 'revoked', revoked_at: new Date() },
    }));

    SistemaLogOperacionalService.registrarRpkiActivity({
      empresaId: row.empresa_id,
      caId,
      objectType: 'aspa',
      objectId: aspaId,
      action: 'revoke',
      details: JSON.stringify({ customer_asn: row.customer_asn }),
    });

    await syncKrillAspasForCa(caId, 'aspa');
    return row;
  }

  static async delete(caId: number, aspaId: number): Promise<void> {
    const found = await prisma.rpki_aspas.findFirst({ where: { id: aspaId, ca_id: caId } });
    if (!found) throw new RpkiClientError('ASPA não encontrado para exclusão.');
    const row = plainAspa(found);

    await prisma.rpki_aspas.delete({ where: { id: aspaId } });

    SistemaLogOperacionalService.registrarRpkiActivity({
      empresaId: row.empresa_id,
      caId,
      objectType: 'aspa',
      objectId: aspaId,
      action: 'delete',
      details: JSON.stringify({ customer_asn: row.customer_asn }),
    });

    await syncKrillAspasForCa(caId, 'aspa');
  }
}
