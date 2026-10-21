export interface BoletoEmpresaData {
  logo: string;
  cedente: string;
  cnpj: string;
  endereco: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
}

export interface BoletoSacadoData {
  nome: string;
  tipoDocumento: 'CPF' | 'CNPJ';
  documento: string;
  endereco: string;
  bairro: string;
  complemento: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface BoletoPlanoData {
  nome: string;
  descricao: string;
  tipoServico: string;
  valor: string;
  periodicidade: string;
}

export interface BoletoFichaData {
  logoBanco: string;
  codigoBancoComDv: string;
  linhaDigitavel: string;
  localPagamento: string;
  agenciaCodigo: string;
  dataVencimento: string;
  dataDocumento: string;
  numeroDocumento: string;
  especieDoc: string;
  dataProcessamento: string;
  nossoNumero: string;
  carteira: string;
  varCarteira: string;
  especie: string;
  valorBoleto: string;
  textoMultaMora: string;
  instrucoes: string[];
  qrcodeImage: string;
  barcodeHtml: string;
}

export interface BoletoRenderData {
  empresa: BoletoEmpresaData;
  sacado: BoletoSacadoData;
  plano: BoletoPlanoData;
  ficha: BoletoFichaData;
}
