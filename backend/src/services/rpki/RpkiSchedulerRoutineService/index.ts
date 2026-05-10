/**
 * RpkiSchedulerRoutineService
 *
 * Equivalente ao scheduler do Krill:
 *   - syncAllParentResources: percorre todas as CAs com parent configurado,
 *     sincroniza recursos via RFC 6492 e renova o certificado de recurso
 *     quando estiver próximo do vencimento (< RENEWAL_THRESHOLD_DAYS dias).
 *   - syncAllRepositories: republica todos os objetos RPKI de cada CA
 *     em seus repositórios via RFC 8181.
 */
import { Op } from 'sequelize';
import { logger } from '../../../utils/logger';
import { RpkiCa } from '../../../models/rpki/RpkiCa';
import { RpkiCaParent } from '../../../models/rpki/RpkiCaParent';
import { RpkiRepository } from '../../../models/rpki/RpkiRepository';

/** Renova o cert de recurso se vencer em menos de X dias. Krill usa 7/30 dias dependendo da versão. */
const RENEWAL_THRESHOLD_DAYS = 30;

interface SchedulerResult {
  success: boolean;
  message: string;
  total: number;
  sucesso: number;
  erro: number;
}

function certExpiresWithinDays(certPem: string, days: number): boolean {
  try {
    const match = certPem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
    if (!match) return true;
    const b64 = match[0]
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .replace(/\s/g, '');
    const der = Buffer.from(b64, 'base64');

    // Localiza campo "Not After" no DER (tag 0x17 = UTCTime, 0x18 = GeneralizedTime)
    let pos = 0;
    const readLength = (buf: Buffer, start: number): { len: number; nextPos: number } => {
      if (buf[start + 1]! < 0x80) return { len: buf[start + 1]!, nextPos: start + 2 };
      const numBytes = buf[start + 1]! & 0x7f;
      let len = 0;
      for (let i = 0; i < numBytes; i++) len = (len << 8) | buf[start + 2 + i]!;
      return { len, nextPos: start + 2 + numBytes };
    };

    // Busca a sequência Validity (dois campos de data consecutivos)
    const threshold = new Date(Date.now() + days * 86_400_000);
    while (pos < der.length - 20) {
      const tag = der[pos];
      if (tag !== 0x17 && tag !== 0x18) { pos++; continue; }
      const { len, nextPos } = readLength(der, pos);
      const raw = der.subarray(nextPos, nextPos + len).toString('ascii');
      let notAfter: Date | null = null;
      if (tag === 0x17 && raw.length >= 12) {
        // UTCTime: YYMMDDHHMMSSZ
        const yy = Number(raw.slice(0, 2));
        const yyyy = yy >= 50 ? 1900 + yy : 2000 + yy;
        notAfter = new Date(`${yyyy}-${raw.slice(2, 4)}-${raw.slice(4, 6)}T${raw.slice(6, 8)}:${raw.slice(8, 10)}:${raw.slice(10, 12)}Z`);
      } else if (tag === 0x18 && raw.length >= 14) {
        // GeneralizedTime: YYYYMMDDHHMMSSZ
        notAfter = new Date(`${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}Z`);
      }
      if (notAfter && !isNaN(notAfter.getTime())) {
        return notAfter <= threshold;
      }
      pos = nextPos + len;
    }
    return true; // se não conseguiu parsear, renova por precaução
  } catch {
    return true;
  }
}

export class RpkiSchedulerRoutineService {
  /**
   * Percorre todas as CAs com CA-pai configurado.
   * Para cada par (CA, parent):
   *   1. Sincroniza recursos via RFC 6492 (list)
   *   2. Se o certificado de recurso estiver ausente ou próximo do vencimento,
   *      solicita renovação via RFC 6492 (request/issue) — igual ao Krill.
   */
  static async syncAllParentResources(): Promise<SchedulerResult> {
    let total = 0;
    let sucesso = 0;
    let erro = 0;

    const parents = await RpkiCaParent.findAll({
      where: { provisioning_status: { [Op.ne]: 'error' } },
      include: [{ model: RpkiCa, as: 'ca' }],
    });

    total = parents.length;

    const { RpkiProvisioningService } = await import('../RpkiProvisioningService');

    for (const parent of parents) {
      const ca = (parent as RpkiCaParent & { ca?: RpkiCa }).ca;
      if (!ca) continue;

      try {
        await RpkiProvisioningService.syncParentResources({
          ca,
          parent,
          empresaId: ca.empresa_id,
        });

        const needsRenewal =
          !ca.resource_cert_pem ||
          certExpiresWithinDays(ca.resource_cert_pem, RENEWAL_THRESHOLD_DAYS);

        if (needsRenewal && ca.ca_cert_pem && ca.private_key_pem) {
          await RpkiProvisioningService.requestResourceCert({ ca, parent });
        }

        sucesso++;
      } catch (err) {
        erro++;
        logger.error('RpkiSchedulerRoutineService: erro ao sincronizar CA-pai', {
          context: 'RpkiSchedulerRoutineService',
          action: 'syncAllParentResources',
          caId: ca.id,
          parentId: parent.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      success: erro === 0,
      message: `RPKI CA-pai: ${sucesso}/${total} sincronizadas${erro > 0 ? `, ${erro} com erro` : ''}`,
      total,
      sucesso,
      erro,
    };
  }

  /**
   * Republica todos os objetos RPKI (ROAs, ASPAs, CRL, Manifesto) de cada CA
   * em seus repositórios via RFC 8181 — equivalente ao Krill republishing all objects.
   */
  static async syncAllRepositories(): Promise<SchedulerResult> {
    let total = 0;
    let sucesso = 0;
    let erro = 0;

    const repositories = await RpkiRepository.findAll({
      where: {
        publication_service_uri: { [Op.ne]: null },
      },
      include: [{ model: RpkiCa, as: 'ca' }],
    });

    total = repositories.length;

    const { RpkiCaService } = await import('../RpkiCaService');

    for (const repo of repositories) {
      const ca = (repo as RpkiRepository & { ca?: RpkiCa }).ca;
      if (!ca) continue;

      try {
        await RpkiCaService.syncRepository(ca.id, repo.id, 'manual');
        sucesso++;
      } catch (err) {
        erro++;
        logger.error('RpkiSchedulerRoutineService: erro ao sincronizar repositório', {
          context: 'RpkiSchedulerRoutineService',
          action: 'syncAllRepositories',
          caId: ca.id,
          repositoryId: repo.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      success: erro === 0,
      message: `RPKI repositórios: ${sucesso}/${total} sincronizados${erro > 0 ? `, ${erro} com erro` : ''}`,
      total,
      sucesso,
      erro,
    };
  }
}
