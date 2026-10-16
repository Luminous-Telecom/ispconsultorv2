import forge from 'node-forge';
import { decrypt, encrypt } from '../../../utils/encryption';

export interface CertificadoA1 {
  keyPem: string;
  certPem: string;
  cadeiaPem: string;
  cnpj: string | null;
  titular: string;
  validade: Date;
}

interface AtributoCertificado {
  type?: string;
  name?: string;
  value?: string;
}

function mensagemSenhaInvalida(erro: unknown): boolean {
  const texto = erro instanceof Error ? erro.message : String(erro);
  return /password|mac|pkcs#12|invalid/i.test(texto);
}

function extrairCnpj(cert: forge.pki.Certificate): string | null {
  const atributos = cert.subject.attributes as AtributoCertificado[];
  for (const atributo of atributos) {
    if (atributo.type === '2.16.76.1.3.3' && atributo.value) {
      const digitos = String(atributo.value).replace(/\D/g, '');
      if (digitos.length >= 14) return digitos.slice(-14);
    }
  }
  const texto = atributos.map((atributo) => String(atributo.value || '')).join(' ');
  const encontrado = texto.replace(/\D/g, '').match(/(\d{14})/);
  return encontrado ? encontrado[1] : null;
}

function chaveConfere(cert: forge.pki.Certificate, chave: forge.pki.rsa.PrivateKey): boolean {
  const publica = cert.publicKey as forge.pki.rsa.PublicKey;
  return Boolean(publica.n && chave.n && publica.n.compareTo(chave.n) === 0);
}

/**
 * Abre um certificado A1 (.pfx/.p12) e devolve chave, certificado e cadeia em PEM.
 */
export function lerCertificadoA1(pfx: Buffer, senha: string): CertificadoA1 {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfx.toString('binary')));
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, senha);
  } catch (erro) {
    if (mensagemSenhaInvalida(erro)) {
      throw new Error('Senha do certificado inválida ou arquivo .pfx corrompido.');
    }
    throw new Error('Não foi possível ler o certificado A1.');
  }

  const bolsasChave = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]
    || p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]
    || [];
  const chave = bolsasChave[0]?.key as forge.pki.rsa.PrivateKey | undefined;
  if (!chave) {
    throw new Error('O arquivo não contém a chave privada do certificado A1.');
  }

  const certificados = (p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [])
    .map((bolsa) => bolsa.cert)
    .filter((cert): cert is forge.pki.Certificate => Boolean(cert));
  const folha = certificados.find((cert) => chaveConfere(cert, chave)) || certificados[0];
  if (!folha) {
    throw new Error('O arquivo não contém o certificado A1.');
  }

  const intermediarios = certificados.filter((cert) => cert !== folha);
  const cn = (folha.subject.getField('CN')?.value as string | undefined) || 'Certificado A1';

  return {
    keyPem: forge.pki.privateKeyToPem(chave),
    certPem: forge.pki.certificateToPem(folha),
    cadeiaPem: [forge.pki.certificateToPem(folha), ...intermediarios.map((cert) => forge.pki.certificateToPem(cert))].join(''),
    cnpj: extrairCnpj(folha),
    titular: cn.slice(0, 255),
    validade: folha.validity.notAfter,
  };
}

export function certificadoVencido(validade: Date, agora = new Date()): boolean {
  return validade.getTime() < agora.getTime();
}

export interface CamposCertificadoSalvos {
  certificado_pfx: string;
  certificado_senha: string;
  certificado_titular: string;
  certificado_cnpj: string | null;
  certificado_validade: Date;
}

export function criptografarCertificado(pfxBase64: string, senha: string): CamposCertificadoSalvos {
  const limpo = pfxBase64.replace(/\s/g, '').replace(/^data:.*?;base64,/, '');
  const pfx = Buffer.from(limpo, 'base64');
  if (pfx.length < 32) {
    throw new Error('Envie o arquivo .pfx do certificado A1.');
  }
  const lido = lerCertificadoA1(pfx, senha);
  return {
    certificado_pfx: encrypt(limpo),
    certificado_senha: encrypt(senha),
    certificado_titular: lido.titular,
    certificado_cnpj: lido.cnpj,
    certificado_validade: lido.validade,
  };
}

export function abrirCertificadoArmazenado(pfxCriptografado: string, senhaCriptografada: string): CertificadoA1 & { pfx: Buffer; senha: string } {
  const senha = decrypt(senhaCriptografada);
  const pfxBase64 = decrypt(pfxCriptografado);
  const pfx = Buffer.from(pfxBase64, 'base64');
  return { ...lerCertificadoA1(pfx, senha), pfx, senha };
}

export function semSegredosNfse<T extends Record<string, unknown>>(dados: T): T {
  const copia = { ...dados };
  delete copia.certificado_pfx;
  delete copia.certificado_senha;
  delete copia.certificado_pfx_base64;
  delete copia.portal_nacional_password;
  delete copia.asaas_api_key;
  return copia;
}

export function mascararCertificado(config: Record<string, unknown>): void {
  config.has_certificado = Boolean(config.certificado_pfx);
  delete config.certificado_pfx;
  delete config.certificado_senha;
}

/**
 * Grava o .pfx enviado ou só troca a senha de um certificado já salvo.
 * Devolve mensagem de erro, ou null quando o payload ficou pronto para o model.
 */
export function aplicarCertificadoNoPayload(
  dados: Record<string, unknown>,
  armazenado?: { certificado_pfx?: string | null; certificado_senha?: string | null } | null
): string | null {
  const pfxBase64 = typeof dados.certificado_pfx_base64 === 'string' ? dados.certificado_pfx_base64.trim() : '';
  const senha = typeof dados.certificado_senha === 'string' ? dados.certificado_senha : '';
  delete dados.certificado_pfx_base64;
  delete dados.certificado_senha;

  if (!pfxBase64 && !senha) return null;

  try {
    if (pfxBase64) {
      if (!senha) return 'Informe a senha do certificado A1.';
      Object.assign(dados, criptografarCertificado(pfxBase64, senha));
      return null;
    }

    if (!armazenado?.certificado_pfx || !armazenado.certificado_senha) {
      return 'Envie o arquivo .pfx junto com a senha do certificado.';
    }
    const pfx = Buffer.from(decrypt(armazenado.certificado_pfx), 'base64');
    lerCertificadoA1(pfx, senha);
    dados.certificado_senha = encrypt(senha);
    return null;
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'Não foi possível ler o certificado A1.';
    if (mensagem.includes('SSH_ENCRYPTION_KEY')) {
      return 'A chave de criptografia do servidor não está configurada. Defina SSH_ENCRYPTION_KEY no .env do backend.';
    }
    return mensagem;
  }
}
