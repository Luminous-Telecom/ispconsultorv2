import forge from 'node-forge';
import { assinarDpsXml } from './assinarDps';
import { lerCertificadoA1 } from './certificadoA1';
import { montarDpsXml } from './dpsXml';

function gerarPfx(senha: string): Buffer {
  const chaves = forge.pki.rsa.generateKeyPair(2048);
  const certificado = forge.pki.createCertificate();
  certificado.publicKey = chaves.publicKey;
  certificado.serialNumber = '01';
  certificado.validity.notBefore = new Date();
  certificado.validity.notAfter = new Date();
  certificado.validity.notAfter.setFullYear(certificado.validity.notBefore.getFullYear() + 1);
  const atributos = [
    { name: 'commonName', value: 'EMPRESA TESTE:12345678000199' },
    { name: 'organizationName', value: 'EMPRESA TESTE' },
  ];
  certificado.setSubject(atributos);
  certificado.setIssuer(atributos);
  certificado.sign(chaves.privateKey, forge.md.sha256.create());
  const p12 = forge.pkcs12.toPkcs12Asn1(chaves.privateKey, [certificado], senha, { algorithm: '3des' });
  const der = forge.asn1.toDer(p12).getBytes();
  return Buffer.from(der, 'binary');
}

describe('certificado A1 da NFS-e', () => {
  it('abre o pfx e assina a DPS', () => {
    const senha = 'senha-teste';
    const lido = lerCertificadoA1(gerarPfx(senha), senha);
    expect(lido.cnpj).toBe('12345678000199');
    expect(lido.keyPem).toContain('PRIVATE KEY');
    expect(lido.validade.getTime()).toBeGreaterThan(Date.now());

    const xml = montarDpsXml({
      ambiente: 'HOMOLOGACAO',
      dataEmissao: new Date('2026-10-16T18:00:00Z'),
      serie: '1',
      numeroDps: 1,
      codigoMunicipioEmissao: '2408102',
      cnpjPrestador: '12345678000199',
      opSimplesNacional: 1,
      regimeEspecialTributacao: 0,
      tomador: {
        documento: '12345678000199',
        nome: 'Cliente Teste',
        endereco: {
          codigoMunicipio: '2408102',
          cep: '59000000',
          logradouro: 'Rua A',
          numero: '10',
          bairro: 'Centro',
        },
      },
      codigoMunicipioPrestacao: '2408102',
      codigoTributacaoNacional: '010701',
      descricaoServico: 'Consultoria',
      valorServico: 10,
      tipoRetencaoIssqn: 1,
    });

    const assinado = assinarDpsXml(xml, lido);
    expect(assinado).toContain('<Signature');
    expect(assinado).toContain('<SignatureValue>');
    expect(assinado).toContain('Id="DPS240810211234567800019900001000000000000001"');
  });

  it('recusa senha errada', () => {
    expect(() => lerCertificadoA1(gerarPfx('certa'), 'errada')).toThrow(/senha do certificado/i);
  });
});
