/**
 * RpkiPublicationService
 *
 * Orquestrador de publicação RPKI. Para cada CA + Repositório:
 *   1. Garante que a CA possui certificado de recurso (via RFC 6492 request/issue)
 *   2. Constrói CRL, ROAs e Manifesto (DER + CMS)
 *   3. Calcula diff com o que está publicado em rpki_published_objects
 *   4. Envia publish/withdraw via RFC 8181 ao publication_service_uri
 *   5. Atualiza rpki_published_objects e status do repositório
 */
import crypto from 'crypto';
import { RpkiCa } from '../../../models/rpki/RpkiCa';
import { RpkiCaParent } from '../../../models/rpki/RpkiCaParent';
import { RpkiRepository } from '../../../models/rpki/RpkiRepository';
import { RpkiPublishedObject } from '../../../models/rpki/RpkiPublishedObject';
import { RpkiRoa } from '../../../models/rpki/RpkiRoa';
import { RpkiAspa } from '../../../models/rpki/RpkiAspa';
import { logger } from '../../../utils/logger';
import {
  buildCrlDer,
  buildRoaCmsObject,
  buildAspaCmsObject,
  buildManifestCmsObject,
  type ManifestFile,
  type RoaEntry,
  type AspaEntry,
} from '../RpkiObjectBuilderService';
import { Rfc8181PublicationService, type PublishObject, type WithdrawObject } from '../Rfc8181PublicationService';
import { RpkiProvisioningService } from '../RpkiProvisioningService';

function normalizeSiaBase(base: string): string {
  return base.endsWith('/') ? base : base + '/';
}

function sha256HexOfBuffer(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function roaFilename(sha256Hex: string): string {
  return `${sha256Hex.slice(0, 32)}.roa`;
}

function aspaFilename(sha256Hex: string): string {
  return `${sha256Hex.slice(0, 32)}.asa`;
}

export class RpkiPublicationService {
  /**
   * Publica todos os objetos (CRL, ROAs, Manifesto) para uma CA + Repositório.
   * Chamado a cada ciclo de sincronização.
   */
  static async publishAll(params: {
    ca: RpkiCa;
    repository: RpkiRepository;
    empresaId: number | null;
  }): Promise<void> {
    const { ca, repository } = params;

    if (!repository.publication_service_uri) {
      throw new Error('Repositório sem publication_service_uri — importe o repository_response primeiro.');
    }
    if (!repository.rsync_base_uri) {
      throw new Error('Repositório sem rsync_base_uri — importe o repository_response primeiro.');
    }
    if (!ca.ca_cert_pem || !ca.private_key_pem) {
      throw new Error('CA sem material BPKI (ca_cert_pem / private_key_pem).');
    }

    // 1. Garante certificado de recurso
    await RpkiPublicationService.ensureResourceCert(ca, params.empresaId);
    await ca.reload();

    if (!ca.resource_cert_pem || !ca.resource_key_pem) {
      throw new Error('CA sem certificado de recurso — sincronize o parent primeiro.');
    }
    if (!ca.resource_cert_url) {
      throw new Error('CA sem resource_cert_url — sincronize o parent primeiro.');
    }

    const siaBase = normalizeSiaBase(repository.rsync_base_uri);
    const crlFilename = `${ca.handle}.crl`;
    const mftFilename = `${ca.handle}.mft`;
    const crlUri = `${siaBase}${crlFilename}`;
    const mftUri = `${siaBase}${mftFilename}`;

    // 2. Incrementa números monotônicos
    const newCrlNumber = (Number(ca.crl_number) || 0) + 1;
    const newManifestNumber = (Number(ca.manifest_number) || 0) + 1;

    const now = new Date();
    const nextUpdate = new Date(now.getTime() + 24 * 3600 * 1000);

    // 3. Constrói CRL
    const crl = await buildCrlDer({
      resourceCaCertPem: ca.resource_cert_pem,
      resourceCaKeyPem: ca.resource_key_pem,
      crlNumber: newCrlNumber,
      validHours: 24,
    });

    // 4. Constrói ROAs
    const activeRoas = await RpkiRoa.findAll({
      where: { ca_id: ca.id, status: 'active' },
    });

    interface BuiltRoa {
      roaId: number;
      derBuffer: Buffer;
      sha256Hex: string;
      filename: string;
      uri: string;
      asn: number;
      prefixes: RoaEntry[];
    }

    const builtRoas: BuiltRoa[] = [];
    for (const roa of activeRoas) {
      const asn = parseInt(String(roa.asn), 10);
      const entries: RoaEntry[] = [
        { prefix: roa.prefix, asn, maxLength: roa.max_length },
      ];
      const objectUri = `${siaBase}TEMP.roa`; // placeholder para calcular hash e URI real
      const built = await buildRoaCmsObject({
        entries,
        resourceCaCertPem: ca.resource_cert_pem,
        resourceCaKeyPem: ca.resource_key_pem,
        resourceCertUrl: ca.resource_cert_url,
        crlUri,
        objectUri: `${siaBase}${roaFilename(sha256HexOfBuffer(Buffer.from([asn])))}`,
      });
      const filename = roaFilename(built.sha256Hex);
      const uri = `${siaBase}${filename}`;
      builtRoas.push({
        roaId: roa.id,
        derBuffer: built.derBuffer,
        sha256Hex: built.sha256Hex,
        filename,
        uri,
        asn,
        prefixes: entries,
      });
    }

    // 5. Constrói ASPAs
    const activeAspas = await RpkiAspa.findAll({
      where: { ca_id: ca.id, status: 'active' },
    });

    interface BuiltAspa {
      aspaId: number;
      derBuffer: Buffer;
      sha256Hex: string;
      filename: string;
      uri: string;
    }

    const builtAspas: BuiltAspa[] = [];
    for (const aspa of activeAspas) {
      const customerAsn = parseInt(String(aspa.customer_asn), 10);
      const rawProviders = aspa.providers_json;
      const providersList: string[] = Array.isArray(rawProviders)
        ? rawProviders
        : JSON.parse(String(rawProviders));
      const providers = providersList.map((p) => {
        const providerAsn = parseInt(p, 10);
        const afi = aspa.afi === 'both' ? undefined : aspa.afi;
        return { providerAsn, afi } as AspaEntry['providers'][number];
      });
      const entry: AspaEntry = { customerAsn, providers };
      const built = await buildAspaCmsObject({
        entry,
        resourceCaCertPem: ca.resource_cert_pem!,
        resourceCaKeyPem: ca.resource_key_pem!,
        resourceCertUrl: ca.resource_cert_url!,
        crlUri,
        objectUri: `${siaBase}${aspaFilename(sha256HexOfBuffer(Buffer.from([customerAsn])))}`,
      });
      const filename = aspaFilename(built.sha256Hex);
      const uri = `${siaBase}${filename}`;
      builtAspas.push({ aspaId: aspa.id, derBuffer: built.derBuffer, sha256Hex: built.sha256Hex, filename, uri });
    }

    // 6. Constrói Manifest (listando CRL + ROAs + ASPAs)
    const manifestFiles: ManifestFile[] = [
      { filename: crlFilename, sha256Hex: crl.sha256Hex },
      ...builtRoas.map((r) => ({ filename: r.filename, sha256Hex: r.sha256Hex })),
      ...builtAspas.map((a) => ({ filename: a.filename, sha256Hex: a.sha256Hex })),
    ];

    const mft = await buildManifestCmsObject({
      manifestNumber: newManifestNumber,
      thisUpdate: now,
      nextUpdate,
      files: manifestFiles,
      resourceCaCertPem: ca.resource_cert_pem,
      resourceCaKeyPem: ca.resource_key_pem,
      resourceCertUrl: ca.resource_cert_url,
      crlUri,
      mftUri,
    });

    // 7. Calcula diff com o que está publicado
    const currentlyPublished = await RpkiPublishedObject.findAll({
      where: { ca_id: ca.id, repository_id: repository.id },
    });
    const publishedByUri = new Map(currentlyPublished.map((p) => [p.uri, p]));

    const toPublish: PublishObject[] = [];
    const toWithdraw: WithdrawObject[] = [];

    interface NewObject {
      uri: string;
      sha256Hex: string;
      derBuffer: Buffer;
      objectType: 'roa' | 'mft' | 'crl' | 'aspa';
      roaId: number | null;
      aspaId: number | null;
    }

    const newObjects: NewObject[] = [
      { uri: crlUri, sha256Hex: crl.sha256Hex, derBuffer: crl.derBuffer, objectType: 'crl', roaId: null, aspaId: null },
      { uri: mftUri, sha256Hex: mft.sha256Hex, derBuffer: mft.derBuffer, objectType: 'mft', roaId: null, aspaId: null },
      ...builtRoas.map((r) => ({
        uri: r.uri, sha256Hex: r.sha256Hex, derBuffer: r.derBuffer,
        objectType: 'roa' as const, roaId: r.roaId, aspaId: null,
      })),
      ...builtAspas.map((a) => ({
        uri: a.uri, sha256Hex: a.sha256Hex, derBuffer: a.derBuffer,
        objectType: 'aspa' as const, roaId: null, aspaId: a.aspaId,
      })),
    ];

    const newUris = new Set(newObjects.map((o) => o.uri));

    // Retira URIs que não existem mais
    for (const [uri, pub] of publishedByUri.entries()) {
      if (!newUris.has(uri)) {
        toWithdraw.push({ uri, hashHex: pub.hash_sha256_hex });
      }
    }

    // Publica novos ou atualizados
    for (const obj of newObjects) {
      const existing = publishedByUri.get(obj.uri);
      const derBase64 = obj.derBuffer.toString('base64');
      if (!existing) {
        toPublish.push({ uri: obj.uri, derBase64 });
      } else if (existing.hash_sha256_hex !== obj.sha256Hex) {
        toPublish.push({ uri: obj.uri, derBase64, previousHashHex: existing.hash_sha256_hex });
      }
    }

    // 8. Envia para o servidor de publicação RFC 8181
    if (toPublish.length > 0 || toWithdraw.length > 0) {
      await Rfc8181PublicationService.sendObjects({
        serviceUri: repository.publication_service_uri,
        bpkiCertPem: ca.ca_cert_pem,
        bpkiKeyPem: ca.private_key_pem,
        publish: toPublish,
        withdraw: toWithdraw,
      });
    }

    // 9. Atualiza rpki_published_objects no banco
    // Remove os que foram retirados
    const urisToRemove = toWithdraw.map((w) => w.uri);
    if (urisToRemove.length > 0) {
      await RpkiPublishedObject.destroy({
        where: { ca_id: ca.id, repository_id: repository.id, uri: urisToRemove },
      });
    }

    // Upsert dos publicados/atualizados
    for (const obj of newObjects) {
      const existing = publishedByUri.get(obj.uri);
      const wasPublished = toPublish.some((p) => p.uri === obj.uri);
      if (!wasPublished && existing) continue; // sem mudança, não precisa atualizar

      if (existing) {
        await existing.update({
          hash_sha256_hex: obj.sha256Hex,
          object_der_b64: obj.derBuffer.toString('base64'),
          roa_id: obj.roaId,
          aspa_id: obj.aspaId,
        });
      } else {
        await RpkiPublishedObject.create({
          ca_id: ca.id,
          repository_id: repository.id,
          uri: obj.uri,
          hash_sha256_hex: obj.sha256Hex,
          object_type: obj.objectType,
          object_der_b64: obj.derBuffer.toString('base64'),
          roa_id: obj.roaId,
          aspa_id: obj.aspaId,
        });
      }
    }

    // 10. Atualiza contadores na CA e status do repositório
    await ca.update({
      crl_number: newCrlNumber,
      manifest_number: newManifestNumber,
    });

    await repository.update({
      publication_status: 'active',
      last_publish_at: now,
      last_error: null,
    });

  }

  /**
   * Garante que a CA possui certificado de recurso válido.
   * Se não tiver, busca o resource cert a partir do parent via RFC 6492.
   */
  private static async ensureResourceCert(
    ca: RpkiCa,
    empresaId: number | null
  ): Promise<void> {
    if (ca.resource_cert_pem && ca.resource_key_pem && ca.resource_cert_url) {
      return; // já tem
    }

    const parents = await RpkiCaParent.findAll({
      where: { ca_id: ca.id, provisioning_status: 'active' },
      order: [['id', 'ASC']],
    });

    if (parents.length === 0) {
      throw new Error('CA sem parents ativos para solicitar certificado de recurso.');
    }

    for (const parent of parents) {
      try {
        await RpkiProvisioningService.requestResourceCert({ ca, parent });
        await ca.reload();
        if (ca.resource_cert_pem) return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn('RpkiPublicationService: falha ao solicitar resource cert via parent', {
          context: 'RpkiPublicationService',
          action: 'ensureResourceCert',
          caId: ca.id,
          parentId: parent.id,
          error: msg,
        });
      }
    }
  }
}
