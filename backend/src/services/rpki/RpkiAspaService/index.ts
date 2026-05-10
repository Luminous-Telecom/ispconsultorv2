import { Op } from 'sequelize';
import { RpkiAspa } from '../../../models/rpki/RpkiAspa';
import { RpkiRepository } from '../../../models/rpki/RpkiRepository';
import { RpkiActivityLog } from '../../../models/rpki/RpkiActivityLog';
import { RpkiClientError } from '../../../utils/errorUtils';
import { RpkiCaService } from '../RpkiCaService';

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

export class RpkiAspaService {
  static async listByCa(caId: number): Promise<RpkiAspa[]> {
    return RpkiAspa.findAll({
      where: { ca_id: caId },
      order: [['id', 'DESC']],
    });
  }

  static async create(input: CreateAspaInput): Promise<RpkiAspa> {
    const customerAsn = String(parseAsn(input.customerAsn));
    const providerNums = parseProviders(input.providers);
    const providersJson = providerNums.map(String);

    const duplicate = await RpkiAspa.findOne({
      where: {
        ca_id: input.caId,
        customer_asn: customerAsn,
        status: { [Op.ne]: 'revoked' },
      },
    });
    if (duplicate) {
      throw new RpkiClientError('Já existe um ASPA ativo para este Customer ASN nesta CA.');
    }

    const now = new Date();
    const notAfter = new Date(now);
    notAfter.setFullYear(now.getFullYear() + 1);

    const row = await RpkiAspa.create({
      empresa_id: input.empresaId,
      ca_id: input.caId,
      customer_asn: customerAsn,
      providers_json: providersJson,
      afi: 'both',
      status: 'active',
      not_before: now,
      not_after: notAfter,
      revoked_at: null,
    });

    RpkiActivityLog.create({
      empresa_id: input.empresaId,
      ca_id: input.caId,
      object_type: 'aspa',
      object_id: row.id,
      action: 'create',
      details: JSON.stringify({ customer_asn: row.customer_asn, providers: providersJson }),
    }).catch(() => undefined);

    await this.syncRepositoriesForCa(input.caId);
    return row;
  }

  static async revoke(caId: number, aspaId: number): Promise<RpkiAspa> {
    const row = await RpkiAspa.findOne({ where: { id: aspaId, ca_id: caId } });
    if (!row) throw new RpkiClientError('ASPA não encontrado para esta CA.');
    if (row.status === 'revoked') return row;

    await row.update({ status: 'revoked', revoked_at: new Date() });

    RpkiActivityLog.create({
      empresa_id: row.empresa_id,
      ca_id: caId,
      object_type: 'aspa',
      object_id: aspaId,
      action: 'revoke',
      details: JSON.stringify({ customer_asn: row.customer_asn }),
    }).catch(() => undefined);

    await this.syncRepositoriesForCa(caId);
    return row;
  }

  static async delete(caId: number, aspaId: number): Promise<void> {
    const row = await RpkiAspa.findOne({ where: { id: aspaId, ca_id: caId } });
    if (!row) throw new RpkiClientError('ASPA não encontrado para exclusão.');

    await RpkiAspa.destroy({ where: { id: aspaId, ca_id: caId } });

    RpkiActivityLog.create({
      empresa_id: row.empresa_id,
      ca_id: caId,
      object_type: 'aspa',
      object_id: aspaId,
      action: 'delete',
      details: JSON.stringify({ customer_asn: row.customer_asn }),
    }).catch(() => undefined);

    await this.syncRepositoriesForCa(caId);
  }

  private static async syncRepositoriesForCa(caId: number): Promise<void> {
    const repositories = await RpkiRepository.findAll({
      where: { ca_id: caId },
      attributes: ['id'],
    });
    for (const repository of repositories) {
      await RpkiCaService.syncRepository(caId, repository.id, 'aspa');
    }
  }
}
