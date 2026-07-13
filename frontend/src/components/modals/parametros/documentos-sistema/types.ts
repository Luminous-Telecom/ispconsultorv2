import { DocumentoSistema } from 'services/documentoSistemaService';
import { ModeloRecibo } from 'services/modeloReciboService';
import { ModeloCarta } from 'services/modeloCartaService';
import { ModeloTermo } from 'services/modeloTermoService';

export type TipoDocumento =
  | 'contrato'
  | 'recibo'
  | 'carta_cobranca'
  | 'termo'
  | 'ordem_servico';

export type DocumentoUnion = DocumentoSistema | ModeloRecibo | ModeloCarta | ModeloTermo;

export interface DocumentosSistemaModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

export interface DocumentoTabProps {
  tipo: TipoDocumento;
  onShowDocumentoModal: (mode: 'create' | 'edit', documentoId: number | null) => void;
  selectedDocumentoId?: number | null; // Opcional, não usado diretamente mas pode ser útil para futuras implementações
  onDocumentoSelected: (documento: DocumentoUnion | null) => void;
  getTipoLabel: (tipo: TipoDocumento) => string;
  onDocumentosLoaded?: (documentos: DocumentoUnion[]) => void;
}

