import { DocumentoForm } from '../types';

export type DocumentoActiveTab = 'contrato' | 'adesao' | 'permanencia' | 'recibo' | 'carta';

export const EMPTY_FORM: DocumentoForm = {
  nome: '',
  descricao: '',
  conteudo: '',
  conteudo_contrato: '',
  conteudo_adesao: '',
  conteudo_permanencia: '',
  conteudo_recibo: '',
  conteudo_carta: '',
};
