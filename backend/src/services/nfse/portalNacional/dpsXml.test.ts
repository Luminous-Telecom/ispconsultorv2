import { montarIdDps, normalizarCodigoTributacaoNacional, normalizarSerieDps } from './dpsId';
import { montarDpsXml } from './dpsXml';

describe('DPS do Portal Nacional', () => {
  it('normaliza código nacional de 4 e de 6 dígitos', () => {
    expect(normalizarCodigoTributacaoNacional('14.01')).toBe('140101');
    expect(normalizarCodigoTributacaoNacional('010701')).toBe('010701');
    expect(normalizarCodigoTributacaoNacional('123')).toBeNull();
  });

  it('recusa série fora de 1 a 5 dígitos', () => {
    expect(normalizarSerieDps('80000')).toBe('80000');
    expect(normalizarSerieDps('00001')).toBe('1');
    expect(normalizarSerieDps('123456')).toBeNull();
    expect(normalizarSerieDps('ABC')).toBeNull();
  });

  it('monta o identificador e o XML com os campos obrigatórios', () => {
    const id = montarIdDps({
      codigoMunicipio: '2408102',
      cnpjPrestador: '12345678000199',
      serie: '1',
      numeroDps: 7,
    });
    expect(id).toBe('DPS240810211234567800019900001000000000000007');

    const xml = montarDpsXml({
      ambiente: 'HOMOLOGACAO',
      dataEmissao: new Date('2026-10-16T18:00:00Z'),
      serie: '1',
      numeroDps: 7,
      codigoMunicipioEmissao: '2408102',
      cnpjPrestador: '12345678000199',
      opSimplesNacional: 1,
      regimeEspecialTributacao: 0,
      tomador: {
        documento: '12345678000199',
        nome: 'Cliente & Teste',
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
      valorServico: 150.5,
      aliquotaIss: 2,
      tipoRetencaoIssqn: 1,
    });

    expect(xml).toContain(`Id="${id}"`);
    expect(xml).toContain('<tpAmb>2</tpAmb>');
    expect(xml).toContain('<cTribNac>010701</cTribNac>');
    expect(xml).toContain('<vServ>150.50</vServ>');
    expect(xml).toContain('<pAliq>2.00</pAliq>');
    expect(xml).toContain('Cliente &amp; Teste');
    expect(xml).not.toContain('<Signature');
  });
});
