import { DocumentoSistema } from '../../../../services/documentoSistemaService';
import { ModeloRecibo } from '../../../../services/modeloReciboService';
import { ModeloCarta } from '../../../../services/modeloCartaService';
import { ModeloTermo } from '../../../../services/modeloTermoService';

export type DocumentoUnion = DocumentoSistema | ModeloRecibo | ModeloCarta | ModeloTermo;

export interface DocumentoForm {
  nome: string;
  descricao: string;
  conteudo: string;
  conteudo_contrato: string;
  conteudo_adesao: string;
  conteudo_permanencia: string;
}

export interface DocumentoModalProps {
  show: boolean;
  onClose: () => void;
  documento?: DocumentoUnion | null;
  tipo: 'contrato' | 'recibo' | 'carta_cobranca' | 'termo';
  onSuccess?: (documento: DocumentoUnion) => void;
}

export interface DocumentoTabProps {
  value: string;
  onChange: (value: string) => void;
  onInsertVariable?: (variable: string) => void;
  editorKey: string;
  placeholder?: string;
}

