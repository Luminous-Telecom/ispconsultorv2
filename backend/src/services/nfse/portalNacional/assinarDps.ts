import { SignedXml } from 'xml-crypto';
import type { CertificadoA1 } from './certificadoA1';

const ALGORITMO_ASSINATURA = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
const CANONICALIZACAO = 'http://www.w3.org/2001/10/xml-exc-c14n#';
const DIGEST = 'http://www.w3.org/2001/04/xmlenc#sha256';
const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';

/**
 * Assina a infDPS com o certificado A1 (RSA-SHA256, exc-c14n, enveloped).
 */
export function assinarDpsXml(xml: string, certificado: CertificadoA1): string {
  const id = xml.match(/<infDPS\b[^>]*\bId="([^"]+)"/)?.[1];
  if (!id) {
    throw new Error('A DPS não tem identificador para assinatura.');
  }

  const assinatura = new SignedXml({
    privateKey: certificado.keyPem,
    publicCert: certificado.certPem,
    signatureAlgorithm: ALGORITMO_ASSINATURA,
    canonicalizationAlgorithm: CANONICALIZACAO,
  });

  assinatura.addReference({
    xpath: "//*[local-name(.)='infDPS']",
    transforms: [ENVELOPED, CANONICALIZACAO],
    digestAlgorithm: DIGEST,
    uri: `#${id}`,
  });

  assinatura.computeSignature(xml, {
    location: { reference: "//*[local-name(.)='DPS']", action: 'append' },
  });

  return assinatura.getSignedXml();
}
