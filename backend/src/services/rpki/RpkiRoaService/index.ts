import { Op } from 'sequelize';
import { RpkiRoa } from '../../../models/rpki/RpkiRoa';
import { RpkiCa } from '../../../models/rpki/RpkiCa';
import { RpkiCaResource } from '../../../models/rpki/RpkiCaResource';
import { RpkiRepository } from '../../../models/rpki/RpkiRepository';
import { RpkiValidationLog } from '../../../models/rpki/RpkiValidationLog';
import { RpkiClientError } from '../../../utils/errorUtils';
import { RpkiCaService } from '../RpkiCaService';
import { collectRisWhoisSuggestedRoas } from '../RpkiBgpRisWhoisService';

interface CreateRpkiRoaInput {
  caId: number;
  empresaId: number | null;
  prefix: string;
  asn: string;
  maxLength: number;
  notBefore: Date;
  notAfter: Date;
}

interface UpdateRpkiRoaInput {
  prefix?: string;
  asn?: string;
  maxLength?: number;
  notBefore?: Date;
  notAfter?: Date;
}

type IpVersion = 'ipv4' | 'ipv6';

function parseAsn(raw: string): string {
  const cleaned = String(raw).trim().toUpperCase().replace(/^AS/, '');
  if (!/^\d+$/.test(cleaned)) {
    throw new RpkiClientError('ASN inválido. Use apenas números (ex.: 64512).');
  }
  return cleaned;
}

function parseCidr(prefix: string): { version: IpVersion; baseBits: string; prefixLength: number } {
  const value = String(prefix).trim();
  const parts = value.split('/');
  if (parts.length !== 2) {
    throw new RpkiClientError('Prefixo inválido. Use formato CIDR (ex.: 203.0.113.0/24).');
  }

  const ipPart = parts[0]?.trim() ?? '';
  const lenPart = parts[1]?.trim() ?? '';
  const prefixLength = Number(lenPart);
  if (!Number.isInteger(prefixLength)) {
    throw new RpkiClientError('Prefixo inválido. O tamanho do prefixo CIDR deve ser inteiro.');
  }

  if (ipPart.includes('.')) {
    const octets = ipPart.split('.');
    if (octets.length !== 4) {
      throw new RpkiClientError('Prefixo IPv4 inválido.');
    }
    const nums = octets.map((oct) => Number(oct));
    if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      throw new RpkiClientError('Prefixo IPv4 inválido.');
    }
    if (prefixLength < 0 || prefixLength > 32) {
      throw new RpkiClientError('Prefixo IPv4 inválido. CIDR deve estar entre /0 e /32.');
    }
    const baseBits = nums.map((n) => n.toString(2).padStart(8, '0')).join('');
    return { version: 'ipv4', baseBits, prefixLength };
  }

  if (!ipPart.includes(':')) {
    throw new RpkiClientError('Prefixo inválido. Use IPv4 ou IPv6 em CIDR.');
  }

  if (prefixLength < 0 || prefixLength > 128) {
    throw new RpkiClientError('Prefixo IPv6 inválido. CIDR deve estar entre /0 e /128.');
  }

  const sections = ipPart.split('::');
  if (sections.length > 2) {
    throw new RpkiClientError('Prefixo IPv6 inválido.');
  }

  const left = sections[0] ? sections[0].split(':').filter(Boolean) : [];
  const right = sections[1] ? sections[1].split(':').filter(Boolean) : [];
  if (left.length + right.length > 8) {
    throw new RpkiClientError('Prefixo IPv6 inválido.');
  }
  const missing = 8 - (left.length + right.length);
  const full = [...left, ...Array.from({ length: missing }, () => '0'), ...right];
  if (full.length !== 8) {
    throw new RpkiClientError('Prefixo IPv6 inválido.');
  }

  const nums = full.map((section) => Number.parseInt(section || '0', 16));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) {
    throw new RpkiClientError('Prefixo IPv6 inválido.');
  }

  const baseBits = nums.map((n) => n.toString(2).padStart(16, '0')).join('');
  return { version: 'ipv6', baseBits, prefixLength };
}

function isPrefixContained(candidate: string, holder: string): boolean {
  const ca = parseCidr(candidate);
  const held = parseCidr(holder);
  if (ca.version !== held.version) return false;
  if (ca.prefixLength < held.prefixLength) return false;
  return ca.baseBits.slice(0, held.prefixLength) === held.baseBits.slice(0, held.prefixLength);
}

function normalizeValidationPrefix(prefix: string, prefixLength: number): string {
  const cleanPrefix = String(prefix ?? '').trim();
  if (!cleanPrefix) return '';
  if (cleanPrefix.includes('/')) return cleanPrefix;
  return `${cleanPrefix}/${prefixLength}`;
}

export class RpkiRoaService {
  static async listByCa(caId: number): Promise<RpkiRoa[]> {
    return RpkiRoa.findAll({
      where: { ca_id: caId },
      order: [['id', 'DESC']],
    });
  }

  static async create(input: CreateRpkiRoaInput): Promise<RpkiRoa> {
    const asn = parseAsn(input.asn);
    const cidr = parseCidr(input.prefix);
    if (!Number.isInteger(input.maxLength)) {
      throw new RpkiClientError('maxLength inválido. Informe um número inteiro.');
    }
    if (input.maxLength < cidr.prefixLength) {
      throw new RpkiClientError('maxLength inválido. Não pode ser menor que o tamanho do prefixo CIDR.');
    }
    if ((cidr.version === 'ipv4' && input.maxLength > 32) || (cidr.version === 'ipv6' && input.maxLength > 128)) {
      throw new RpkiClientError('maxLength inválido para a versão do IP informada.');
    }
    if (input.notAfter <= input.notBefore) {
      throw new RpkiClientError('Período inválido. "notAfter" deve ser maior que "notBefore".');
    }

    const resourceType = cidr.version;
    const resources = await RpkiCaResource.findAll({
      where: {
        ca_id: input.caId,
        resource_type: resourceType,
      },
    });
    const hasCoverage = resources.some((resource) => {
      const start = resource.start_range?.trim();
      return start ? isPrefixContained(input.prefix, start) : false;
    });
    if (!hasCoverage) {
      throw new RpkiClientError('Prefixo ROA não pertence aos recursos atualmente delegados para esta CA.');
    }

    const duplicate = await RpkiRoa.findOne({
      where: {
        ca_id: input.caId,
        prefix: input.prefix.trim(),
        asn,
        max_length: input.maxLength,
        status: { [Op.ne]: 'revoked' },
      },
    });
    if (duplicate) {
      throw new RpkiClientError('Já existe um ROA ativo/expirado com o mesmo prefixo, ASN e maxLength nesta CA.');
    }

    const row = await RpkiRoa.create({
      empresa_id: input.empresaId,
      ca_id: input.caId,
      prefix: input.prefix.trim(),
      asn,
      max_length: input.maxLength,
      not_before: input.notBefore,
      not_after: input.notAfter,
      status: 'active',
      revoked_at: null,
    });

    await this.syncRepositoriesForCa(input.caId);
    return row;
  }

  static async update(caId: number, roaId: number, input: UpdateRpkiRoaInput): Promise<RpkiRoa> {
    const row = await RpkiRoa.findOne({ where: { id: roaId, ca_id: caId } });
    if (!row) throw new RpkiClientError('ROA não encontrado para esta CA.');
    if (row.status === 'revoked') {
      throw new RpkiClientError('ROA revogado não pode ser alterado. Crie um novo ROA.');
    }

    const payload: Record<string, unknown> = {};
    if (input.prefix != null) payload.prefix = input.prefix.trim();
    if (input.asn != null) payload.asn = parseAsn(input.asn);
    if (input.maxLength != null) payload.max_length = input.maxLength;
    if (input.notBefore != null) payload.not_before = input.notBefore;
    if (input.notAfter != null) payload.not_after = input.notAfter;

    const nextPrefix = String(payload.prefix ?? row.prefix);
    const nextAsn = String(payload.asn ?? row.asn);
    const nextMaxLength = Number(payload.max_length ?? row.max_length);
    const nextNotBefore = new Date(payload.not_before as Date ?? row.not_before);
    const nextNotAfter = new Date(payload.not_after as Date ?? row.not_after);

    const cidr = parseCidr(nextPrefix);
    if (!Number.isInteger(nextMaxLength)) {
      throw new RpkiClientError('maxLength inválido. Informe um número inteiro.');
    }
    if (nextMaxLength < cidr.prefixLength) {
      throw new RpkiClientError('maxLength inválido. Não pode ser menor que o tamanho do prefixo CIDR.');
    }
    if ((cidr.version === 'ipv4' && nextMaxLength > 32) || (cidr.version === 'ipv6' && nextMaxLength > 128)) {
      throw new RpkiClientError('maxLength inválido para a versão do IP informada.');
    }
    if (nextNotAfter <= nextNotBefore) {
      throw new RpkiClientError('Período inválido. "notAfter" deve ser maior que "notBefore".');
    }

    const resourceType = cidr.version;
    const resources = await RpkiCaResource.findAll({
      where: { ca_id: caId, resource_type: resourceType },
    });
    const hasCoverage = resources.some((resource) => {
      const start = resource.start_range?.trim();
      return start ? isPrefixContained(nextPrefix, start) : false;
    });
    if (!hasCoverage) {
      throw new RpkiClientError('Prefixo ROA não pertence aos recursos atualmente delegados para esta CA.');
    }

    const duplicate = await RpkiRoa.findOne({
      where: {
        id: { [Op.ne]: roaId },
        ca_id: caId,
        prefix: nextPrefix,
        asn: nextAsn,
        max_length: nextMaxLength,
        status: { [Op.ne]: 'revoked' },
      },
    });
    if (duplicate) {
      throw new RpkiClientError('Já existe outro ROA ativo/expirado com o mesmo prefixo, ASN e maxLength nesta CA.');
    }

    await row.update(payload);
    await this.syncRepositoriesForCa(caId);
    return row;
  }

  static async revoke(caId: number, roaId: number): Promise<RpkiRoa> {
    const row = await RpkiRoa.findOne({ where: { id: roaId, ca_id: caId } });
    if (!row) throw new RpkiClientError('ROA não encontrado para esta CA.');
    if (row.status === 'revoked') return row;

    await row.update({
      status: 'revoked',
      revoked_at: new Date(),
    });
    await this.syncRepositoriesForCa(caId);
    return row;
  }

  static async delete(caId: number, roaId: number): Promise<void> {
    const deleted = await RpkiRoa.destroy({
      where: { id: roaId, ca_id: caId },
    });
    if (!deleted) {
      throw new RpkiClientError('ROA não encontrado para exclusão.');
    }
    await this.syncRepositoriesForCa(caId);
  }

  static async analyzeByCa(caId: number): Promise<{
    total: number;
    active: number;
    revoked: number;
    expired: number;
    inconsistent: number;
    rows: Array<{
      analysis_id: string;
      roa_id: number;
      prefix: string;
      asn: string;
      max_length: number;
      status: 'ok' | 'revoked' | 'expired' | 'inconsistent' | 'not_found';
      message: string;
      selectable: boolean;
    }>;
    details: Array<{ roa_id: number; prefix: string; asn: string; reason: string }>;
  }> {
    const roas = await RpkiRoa.findAll({
      where: { ca_id: caId },
      order: [['id', 'DESC']],
    });
    const resources = await RpkiCaResource.findAll({
      where: { ca_id: caId },
      order: [['id', 'ASC']],
    });
    const ca = await RpkiCa.findByPk(caId);
    const empresaId = ca?.empresa_id ?? roas[0]?.empresa_id ?? null;
    const validationLogs = await RpkiValidationLog.findAll({
      where: empresaId == null ? { empresa_id: null } : { empresa_id: empresaId },
      order: [['created_at', 'DESC']],
      limit: 500,
    });
    const now = new Date();
    let active = 0;
    let revoked = 0;
    let expired = 0;
    let inconsistent = 0;
    const rows: Array<{
      analysis_id: string;
      roa_id: number;
      prefix: string;
      asn: string;
      max_length: number;
      status: 'ok' | 'revoked' | 'expired' | 'inconsistent' | 'not_found';
      message: string;
      selectable: boolean;
    }> = [];
    const details: Array<{ roa_id: number; prefix: string; asn: string; reason: string }> = [];

    for (const roa of roas) {
      if (roa.status === 'revoked') {
        revoked += 1;
        rows.push({
          analysis_id: `roa:${roa.id}`,
          roa_id: roa.id,
          prefix: roa.prefix,
          asn: roa.asn,
          max_length: roa.max_length,
          status: 'revoked',
          message: 'Revogada',
          selectable: false,
        });
        continue;
      }

      if (roa.not_after < now || roa.status === 'expired') {
        expired += 1;
        rows.push({
          analysis_id: `roa:${roa.id}`,
          roa_id: roa.id,
          prefix: roa.prefix,
          asn: roa.asn,
          max_length: roa.max_length,
          status: 'expired',
          message: 'Sugestão: revogar/substituir',
          selectable: true,
        });
      } else {
        active += 1;
        rows.push({
          analysis_id: `roa:${roa.id}`,
          roa_id: roa.id,
          prefix: roa.prefix,
          asn: roa.asn,
          max_length: roa.max_length,
          status: 'ok',
          message: 'OK',
          selectable: false,
        });
      }

      try {
        const cidr = parseCidr(roa.prefix);
        if (roa.max_length < cidr.prefixLength) {
          inconsistent += 1;
          rows[rows.length - 1] = {
            analysis_id: `roa:${roa.id}`,
            roa_id: roa.id,
            prefix: roa.prefix,
            asn: roa.asn,
            max_length: roa.max_length,
            status: 'inconsistent',
            message: 'Sugestão: corrigir ou revogar',
            selectable: true,
          };
          details.push({
            roa_id: roa.id,
            prefix: roa.prefix,
            asn: roa.asn,
            reason: `maxLength ${roa.max_length} menor que o prefixo ${cidr.prefixLength}`,
          });
          continue;
        }

        const scopedResources = resources.filter((resource) => resource.resource_type === cidr.version);
        const hasCoverage = scopedResources.some((resource) => {
          const start = resource.start_range?.trim();
          return start ? isPrefixContained(roa.prefix, start) : false;
        });
        if (!hasCoverage) {
          inconsistent += 1;
          rows[rows.length - 1] = {
            analysis_id: `roa:${roa.id}`,
            roa_id: roa.id,
            prefix: roa.prefix,
            asn: roa.asn,
            max_length: roa.max_length,
            status: 'not_found',
            message: 'Sugestão: revogar/substituir',
            selectable: true,
          };
          details.push({
            roa_id: roa.id,
            prefix: roa.prefix,
            asn: roa.asn,
            reason: 'Prefixo ROA fora dos recursos delegados atuais da CA',
          });
          continue;
        }
      } catch (error) {
        inconsistent += 1;
        rows[rows.length - 1] = {
          analysis_id: `roa:${roa.id}`,
          roa_id: roa.id,
          prefix: roa.prefix,
          asn: roa.asn,
          max_length: roa.max_length,
          status: 'inconsistent',
          message: 'Sugestão: corrigir ou revogar',
          selectable: true,
        };
        details.push({
          roa_id: roa.id,
          prefix: roa.prefix,
          asn: roa.asn,
          reason: error instanceof Error ? error.message : 'Formato inválido',
        });
      }
    }

    const existingKey = new Set(
      roas.map((roa) => `${roa.prefix}|${roa.asn}|${roa.max_length}`)
    );
    const suggestionKey = new Set<string>();
    for (const log of validationLogs) {
      if (log.state !== 'invalid' && log.state !== 'not-found') {
        continue;
      }

      const prefixLength = Number(log.prefix_length);
      const prefix = normalizeValidationPrefix(String(log.prefix ?? '').trim(), prefixLength);
      const asn = String(log.asn ?? '').trim();
      const maxLength = prefixLength;
      if (!prefix || !asn || !Number.isFinite(maxLength) || maxLength <= 0) {
        continue;
      }

      const key = `${prefix}|${asn}|${maxLength}`;
      if (existingKey.has(key) || suggestionKey.has(key)) continue;

      try {
        const cidr = parseCidr(prefix);
        const scopedResources = resources.filter((resource) => resource.resource_type === cidr.version);
        const hasCoverage = scopedResources.some((resource) => {
          const start = resource.start_range?.trim();
          return start ? isPrefixContained(prefix, start) : false;
        });
        if (!hasCoverage) {
          continue;
        }
      } catch {
        continue;
      }

      suggestionKey.add(key);
      rows.push({
        analysis_id: `sug:${prefix}|${asn}|${maxLength}`,
        roa_id: 0,
        prefix,
        asn,
        max_length: maxLength,
        status: 'not_found',
        message: 'Sugestão automática (origem: validações)',
        selectable: true,
      });
    }

    if (resources.length > 0) {
      try {
        const ris = await collectRisWhoisSuggestedRoas({
          resources,
          existingRoas: [...roas],
          now,
        });

        for (const sug of ris.suggestions) {
          const keyTriple = `${sug.prefix}|${sug.asn}|${sug.max_length}`;
          if (existingKey.has(keyTriple) || suggestionKey.has(keyTriple)) continue;

          suggestionKey.add(keyTriple);
          const inconsistent = sug.rationale === 'invalid_asn' || sug.rationale === 'invalid_length';
          const message =
            sug.rationale === 'not_found'
              ? 'Sugestão automática (RIS/BGP: anúncio sem ROA)'
              : sug.rationale === 'invalid_asn'
                ? 'Sugestão automática (RIS/BGP: ASN não autorizado)'
                : 'Sugestão automática (RIS/BGP: prefixo específico demais)';
          rows.push({
            analysis_id: `sug:ris:${sug.prefix}|${sug.asn}|${sug.max_length}`,
            roa_id: 0,
            prefix: sug.prefix,
            asn: sug.asn,
            max_length: sug.max_length,
            status: inconsistent ? 'inconsistent' : 'not_found',
            message,
            selectable: true,
          });
        }
      } catch {
        /* RIS/BGP opcional: falhas não impedem análise local das ROAs */
      }
    }

    return {
      total: roas.length,
      active,
      revoked,
      expired,
      inconsistent,
      rows,
      details,
    };
  }

  static async applySuggestions(
    caId: number,
    empresaId: number | null,
    suggestions: Array<{ prefix: string; asn: string; max_length: number }>
  ): Promise<{ created: number }> {
    let created = 0;
    for (const item of suggestions) {
      const exists = await RpkiRoa.findOne({
        where: {
          ca_id: caId,
          prefix: item.prefix,
          asn: item.asn,
          max_length: item.max_length,
          status: { [Op.ne]: 'revoked' },
        },
      });
      if (exists) continue;

      const now = new Date();
      const notAfter = new Date(now);
      notAfter.setFullYear(now.getFullYear() + 1);
      await this.create({
        caId,
        empresaId,
        prefix: item.prefix,
        asn: item.asn,
        maxLength: item.max_length,
        notBefore: now,
        notAfter,
      });
      created += 1;
    }
    return { created };
  }

  private static async syncRepositoriesForCa(caId: number): Promise<void> {
    const repositories = await RpkiRepository.findAll({
      where: { ca_id: caId },
      attributes: ['id'],
    });
    for (const repository of repositories) {
      await RpkiCaService.syncRepository(caId, repository.id);
    }
  }
}

