const CODIGO_6 = /^\d{6}$/;

/**
 * Código nacional de tributação (cTribNac): 6 dígitos.
 * Quatro dígitos (item da LC 116) recebem desdobro 01.
 */
export function normalizarCodigoTributacaoNacional(codigo: string | null | undefined): string | null {
  const digitos = String(codigo || '').replace(/\D/g, '');
  if (digitos.length === 4) return `${digitos}01`;
  if (CODIGO_6.test(digitos)) return digitos;
  return null;
}

/** Série da DPS: 1 a 5 dígitos, sem zero à esquerda no XML. */
export function normalizarSerieDps(serie: string | null | undefined): string | null {
  const digitos = String(serie || '').replace(/\D/g, '');
  if (!digitos) return null;
  const numero = String(parseInt(digitos, 10));
  if (!/^[1-9]\d{0,4}$/.test(numero)) return null;
  return numero;
}

/**
 * Id da infDPS: DPS + município (7) + tipo inscrição (1=CNPJ, 2=CPF)
 * + inscrição (14) + série (5) + número (15).
 */
export function montarIdDps(params: {
  codigoMunicipio: string;
  cnpjPrestador: string;
  serie: string;
  numeroDps: number;
}): string {
  const municipio = params.codigoMunicipio.replace(/\D/g, '');
  const cnpj = params.cnpjPrestador.replace(/\D/g, '').padStart(14, '0');
  const serie = params.serie.padStart(5, '0');
  const numero = String(params.numeroDps).padStart(15, '0');
  if (municipio.length !== 7 || cnpj.length !== 14 || serie.length !== 5 || numero.length !== 15) {
    throw new Error('Não foi possível montar o identificador da DPS.');
  }
  return `DPS${municipio}1${cnpj}${serie}${numero}`;
}
