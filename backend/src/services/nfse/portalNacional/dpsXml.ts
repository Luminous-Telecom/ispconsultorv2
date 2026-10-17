import { montarIdDps } from './dpsId';
import { stripCnpj } from '../../../utils/cnpj';

const NS = 'http://www.sped.fazenda.gov.br/nfse';

export interface EnderecoDps {
  codigoMunicipio: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
}

export interface TomadorDps {
  documento: string;
  nome: string;
  endereco: EnderecoDps;
  email?: string | null;
  telefone?: string | null;
}

export interface DpsXmlInput {
  ambiente: 'HOMOLOGACAO' | 'PRODUCAO';
  dataEmissao: Date;
  serie: string;
  numeroDps: number;
  codigoMunicipioEmissao: string;
  cnpjPrestador: string;
  inscricaoMunicipal?: string | null;
  opSimplesNacional: 1 | 2 | 3;
  regimeEspecialTributacao: number;
  regimeApuracaoSn?: 1 | 2 | 3 | null;
  tomador: TomadorDps;
  codigoMunicipioPrestacao: string;
  codigoTributacaoNacional: string;
  descricaoServico: string;
  valorServico: number;
  valorDesconto?: number;
  aliquotaIss?: number;
  tipoRetencaoIssqn: 1 | 2 | 3;
}

function xmlEscape(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function tag(nome: string, valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') return '';
  return `<${nome}>${xmlEscape(String(valor))}</${nome}>`;
}

function dinheiro(valor: number): string {
  return valor.toFixed(2);
}

function dataHoraBrasilia(data: Date): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(data);
  const mapa = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return `${mapa.year}-${mapa.month}-${mapa.day}T${mapa.hour}:${mapa.minute}:${mapa.second}-03:00`;
}

function dataBrasilia(data: Date): string {
  return dataHoraBrasilia(data).slice(0, 10);
}

function enderecoXml(endereco: EnderecoDps): string {
  const complemento = endereco.complemento?.trim();
  return `<end><endNac>${tag('cMun', endereco.codigoMunicipio)}${tag('CEP', endereco.cep)}</endNac>${tag('xLgr', endereco.logradouro.slice(0, 255))}${tag('nro', endereco.numero.slice(0, 60))}${complemento ? tag('xCpl', complemento.slice(0, 156)) : ''}${tag('xBairro', endereco.bairro.slice(0, 60))}</end>`;
}

/**
 * XML da DPS no leiaute nacional v1.01, ainda sem assinatura.
 */
export function montarDpsXml(input: DpsXmlInput): string {
  const id = montarIdDps({
    codigoMunicipio: input.codigoMunicipioEmissao,
    cnpjPrestador: input.cnpjPrestador,
    serie: input.serie,
    numeroDps: input.numeroDps,
  });
  const tpAmb = input.ambiente === 'PRODUCAO' ? 1 : 2;
  const documento = stripCnpj(input.tomador.documento);
  const tagDocumento = documento.length === 11 && /^\d{11}$/.test(documento)
    ? tag('CPF', documento)
    : tag('CNPJ', /^\d+$/.test(documento) ? documento.padStart(14, '0') : documento);
  const desconto = input.valorDesconto && input.valorDesconto > 0
    ? `<vDescCondIncond>${tag('vDescIncond', dinheiro(input.valorDesconto))}</vDescCondIncond>`
    : '';
  const aliquota = input.aliquotaIss && input.aliquotaIss > 0 && input.opSimplesNacional === 1
    ? tag('pAliq', dinheiro(input.aliquotaIss))
    : '';
  const regimeApuracao = input.opSimplesNacional === 3 && input.regimeApuracaoSn
    ? tag('regApTribSN', input.regimeApuracaoSn)
    : '';
  const inscricao = input.inscricaoMunicipal?.replace(/\D/g, '');
  const email = input.tomador.email?.includes('@') ? tag('email', input.tomador.email.slice(0, 80)) : '';
  const telefoneDigitos = input.tomador.telefone?.replace(/\D/g, '') || '';
  const telefone = telefoneDigitos.length >= 10 ? tag('fone', telefoneDigitos.slice(0, 20)) : '';

  return `<?xml version="1.0" encoding="UTF-8"?><DPS xmlns="${NS}" versao="1.01"><infDPS Id="${id}">${tag('tpAmb', tpAmb)}${tag('dhEmi', dataHoraBrasilia(input.dataEmissao))}${tag('verAplic', 'ISPConsultor')}${tag('serie', input.serie)}${tag('nDPS', input.numeroDps)}${tag('dCompet', dataBrasilia(input.dataEmissao))}${tag('tpEmit', 1)}${tag('cLocEmi', input.codigoMunicipioEmissao)}<prest>${tag('CNPJ', stripCnpj(input.cnpjPrestador))}${inscricao ? tag('IM', inscricao.slice(0, 15)) : ''}<regTrib>${tag('opSimpNac', input.opSimplesNacional)}${regimeApuracao}${tag('regEspTrib', input.regimeEspecialTributacao)}</regTrib></prest><toma>${tagDocumento}${tag('xNome', input.tomador.nome.slice(0, 150))}${enderecoXml(input.tomador.endereco)}${telefone}${email}</toma><serv><locPrest>${tag('cLocPrestacao', input.codigoMunicipioPrestacao)}</locPrest><cServ>${tag('cTribNac', input.codigoTributacaoNacional)}${tag('xDescServ', input.descricaoServico.slice(0, 2000))}</cServ></serv><valores><vServPrest>${tag('vServ', dinheiro(input.valorServico))}</vServPrest>${desconto}<trib><tribMun>${tag('tribISSQN', 1)}${tag('tpRetISSQN', input.tipoRetencaoIssqn)}${aliquota}</tribMun><totTrib>${tag('indTotTrib', 0)}</totTrib></trib></valores></infDPS></DPS>`;
}
