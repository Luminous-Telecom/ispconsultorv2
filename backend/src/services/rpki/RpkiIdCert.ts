/**
 * IdCert BPKI no perfil Krill / rpki-rs (RFC 8183, 6492, 8181).
 *
 * - TA autoassinado: basicConstraints CA + SKI (sem keyUsage).
 * - Subject/issuer: CN = hex do KeyIdentifier (SHA-1 do SPKI), como Name::from_pub_key.
 * - CMS: EE efêmero por mensagem (IdCert::new_ee), CRL da TA.
 */
import forge from 'node-forge';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { injectRpkiCrlFieldIntoSignedDataCms } from './RpkiCmsCrl';

const execFileAsync = promisify(execFile);

const OID_RPKI_XML_CONTENT = '1.2.840.113549.1.9.16.1.28';

/** SHA-1 do DER SubjectPublicKeyInfo (KeyIdentifier RPKI / RFC 6487). */
export async function computeRpkiKeyIdentifierHexFromPrivateKeyPem(
  privateKeyPem: string
): Promise<string> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-ski-'));
  try {
    const keyPath = path.join(tempDir, 'key.pem');
    const pubDerPath = path.join(tempDir, 'pub.der');
    await fs.writeFile(keyPath, privateKeyPem, 'utf8');
    await execFileAsync('openssl', ['pkey', '-in', keyPath, '-pubout', '-outform', 'DER', '-out', pubDerPath]);
    const pubDer = await fs.readFile(pubDerPath);
    const md = forge.md.sha1.create();
    md.update(pubDer.toString('binary'));
    return md.digest().toHex().toUpperCase();
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function sanitizeCnForOpenSsl(hexSki: string): string {
  return hexSki.replace(/[^A-Za-z0-9]/g, '').slice(0, 64) || 'RPKI';
}

/** IdCert TA (Krill IdCert::new_ta). */
export async function issueIdCertTa(privateKeyPem: string): Promise<string> {
  const skiHex = await computeRpkiKeyIdentifierHexFromPrivateKeyPem(privateKeyPem);
  const cn = sanitizeCnForOpenSsl(skiHex);

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-id-ta-'));
  try {
    const keyPath = path.join(tempDir, 'key.pem');
    const csrPath = path.join(tempDir, 'csr.pem');
    const certPath = path.join(tempDir, 'ta.pem');
    const extPath = path.join(tempDir, 'ext.cnf');

    await fs.writeFile(keyPath, privateKeyPem, 'utf8');
    await fs.writeFile(
      extPath,
      `[v3_id_ta]
basicConstraints = critical,CA:TRUE
subjectKeyIdentifier = hash
`,
      'utf8'
    );

    await execFileAsync('openssl', ['req', '-new', '-key', keyPath, '-subj', `/CN=${cn}`, '-out', csrPath]);
    await execFileAsync('openssl', [
      'x509',
      '-req',
      '-in',
      csrPath,
      '-signkey',
      keyPath,
      '-days',
      '5475',
      '-sha256',
      '-extfile',
      extPath,
      '-extensions',
      'v3_id_ta',
      '-out',
      certPath,
    ]);

    return await fs.readFile(certPath, 'utf8');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/** IdCert EE emitido pela TA (Krill IdCert::new_ee), validade curta para CMS. */
export async function issueIdCertEe(params: {
  taCertPem: string;
  taKeyPem: string;
  eeKeyPem: string;
}): Promise<string> {
  const skiHex = await computeRpkiKeyIdentifierHexFromPrivateKeyPem(params.eeKeyPem);
  const cn = sanitizeCnForOpenSsl(skiHex);

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-id-ee-'));
  try {
    const taKeyPath = path.join(tempDir, 'ta_key.pem');
    const taCertPath = path.join(tempDir, 'ta_cert.pem');
    const eeKeyPath = path.join(tempDir, 'ee_key.pem');
    const csrPath = path.join(tempDir, 'ee_csr.pem');
    const certPath = path.join(tempDir, 'ee.pem');
    const extPath = path.join(tempDir, 'ext.cnf');

    await fs.writeFile(taKeyPath, params.taKeyPem, 'utf8');
    await fs.writeFile(taCertPath, params.taCertPem, 'utf8');
    await fs.writeFile(eeKeyPath, params.eeKeyPem, 'utf8');
    await fs.writeFile(
      extPath,
      `[v3_id_ee]
basicConstraints = CA:FALSE
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid
`,
      'utf8'
    );

    await execFileAsync('openssl', ['req', '-new', '-key', eeKeyPath, '-subj', `/CN=${cn}`, '-out', csrPath]);
    await execFileAsync('openssl', [
      'x509',
      '-req',
      '-in',
      csrPath,
      '-CA',
      taCertPath,
      '-CAkey',
      taKeyPath,
      '-CAcreateserial',
      '-days',
      '1',
      '-sha256',
      '-extfile',
      extPath,
      '-extensions',
      'v3_id_ee',
      '-out',
      certPath,
    ]);

    return await fs.readFile(certPath, 'utf8');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function generateBpkiCrlDer(certPem: string, keyPem: string): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-bpki-crl-'));
  try {
    const demoCaDir = path.join(tempDir, 'demoCA');
    await fs.mkdir(demoCaDir, { recursive: true });
    await fs.writeFile(path.join(demoCaDir, 'index.txt'), '', 'utf8');
    await fs.writeFile(path.join(demoCaDir, 'serial'), '1000\n', 'utf8');
    await fs.writeFile(path.join(demoCaDir, 'crlnumber'), '1000\n', 'utf8');
    await fs.writeFile(path.join(tempDir, 'cert.pem'), certPem, 'utf8');
    await fs.writeFile(path.join(tempDir, 'key.pem'), keyPem, 'utf8');
    await fs.writeFile(
      path.join(tempDir, 'openssl.cnf'),
      `[ca]
default_ca = CA_default

[CA_default]
dir = ./demoCA
database = $dir/index.txt
serial = $dir/serial
crlnumber = $dir/crlnumber
certificate = ./cert.pem
private_key = ./key.pem
default_md = sha256
default_crl_days = 1
`,
      'utf8'
    );

    await execFileAsync(
      'openssl',
      ['ca', '-config', 'openssl.cnf', '-gencrl', '-out', 'crl.pem', '-batch'],
      { cwd: tempDir }
    );
    await execFileAsync(
      'openssl',
      ['crl', '-in', 'crl.pem', '-outform', 'DER', '-out', 'crl.der'],
      { cwd: tempDir }
    );
    return await fs.readFile(path.join(tempDir, 'crl.der'));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * CMS BPKI estilo Krill SignedMessage::create (EE efêmero + CRL da TA).
 */
export async function signKrillIdCertCms(xml: string, taCertPem: string, taKeyPem: string): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rpki-id-cms-'));
  try {
    const xmlPath = path.join(tempDir, 'msg.xml');
    const taKeyPath = path.join(tempDir, 'ta_key.pem');
    const eeKeyPath = path.join(tempDir, 'ee_key.pem');
    const eeCertPath = path.join(tempDir, 'ee_cert.pem');
    const outPath = path.join(tempDir, 'out.cms.der');

    await fs.writeFile(xmlPath, xml, 'utf8');
    await fs.writeFile(taKeyPath, taKeyPem, 'utf8');
    await execFileAsync('openssl', ['genrsa', '-out', eeKeyPath, '2048']);

    const eeKeyPem = await fs.readFile(eeKeyPath, 'utf8');
    const eeCertPem = await issueIdCertEe({ taCertPem, taKeyPem, eeKeyPem });
    await fs.writeFile(eeCertPath, eeCertPem, 'utf8');

    await execFileAsync('openssl', [
      'cms',
      '-sign',
      '-in',
      xmlPath,
      '-signer',
      eeCertPath,
      '-inkey',
      eeKeyPath,
      '-binary',
      '-nodetach',
      '-nosmimecap',
      '-keyid',
      '-md',
      'sha256',
      '-econtent_type',
      OID_RPKI_XML_CONTENT,
      '-outform',
      'DER',
      '-out',
      outPath,
    ]);

    const raw = await fs.readFile(outPath);
    const crlDer = await generateBpkiCrlDer(taCertPem, taKeyPem);
    return injectRpkiCrlFieldIntoSignedDataCms(raw, crlDer);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export function hasKrillStyleIdCertTa(pemCert: string): boolean {
  try {
    const cert = forge.pki.certificateFromPem(pemCert);
    const bc = cert.getExtension('basicConstraints') as { cA?: boolean } | undefined;
    const ku = cert.getExtension('keyUsage') as { keyCertSign?: boolean } | undefined;
    if (ku?.keyCertSign) return false;
    return Boolean(bc?.cA);
  } catch {
    return false;
  }
}
