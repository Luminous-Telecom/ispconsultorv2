import React, { Suspense, lazy, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import Loading from 'components/ui/Loading';
import { useApiError } from 'hooks/useApiError';
import { ERROR_MESSAGES } from 'constants/ErrorMessages';
import DocumentoSistemaService from 'services/documentoSistemaService';
import ModeloTermoService from 'services/modeloTermoService';
import { DocumentoUnion } from 'components/modals/parametros/documento/types';

const PlanoModal = lazy(() => import('components/modals/planos/PlanoModal'));
const BancoModal = lazy(() => import('components/modals/bancos/BancoModal'));
const TipoCobrancaContratoModal = lazy(() => import('components/modals/tipoCobrancaContrato/TipoCobrancaContratoModal'));
const ClienteModal = lazy(() => import('components/modals/clientes/cliente/ClienteModal'));
const FornecedorModal = lazy(() => import('components/modals/fornecedores/fornecedorModal/FornecedorModal'));
const ServidorEmailModal = lazy(() => import('components/modals/parametros/servidor-email/ServidorEmailModal'));
const ServidorWhatsappModal = lazy(() => import('components/modals/parametros/servidor-whatsapp/ServidorWhatsappModal'));
const ContratoModal = lazy(() => import('components/modals/clientes/contrato/ContratoModal'));
const DocumentoModal = lazy(() => import('components/modals/parametros/documento/documentoModal/DocumentoModal'));

export type EntityRecordKind =
  | 'plano'
  | 'banco'
  | 'tipoCobranca'
  | 'cliente'
  | 'fornecedor'
  | 'servidorEmail'
  | 'servidorWhatsapp'
  | 'contrato'
  | 'modeloContrato'
  | 'modeloTermo';

interface EntityRecordEditModalProps {
  kind: EntityRecordKind;
  recordId: number;
  onClose: () => void;
}

function ModeloDocumentoEdit({
  recordId,
  tipo,
  onClose,
}: {
  recordId: number;
  tipo: 'contrato' | 'termo';
  onClose: () => void;
}) {
  const { showApiError } = useApiError();
  const query = useQuery({
    queryKey: ['entity-record-edit', tipo, recordId],
    queryFn: async (): Promise<DocumentoUnion> => {
      if (tipo === 'contrato') {
        const response = await DocumentoSistemaService.getById(recordId);
        return response.data;
      }
      const response = await ModeloTermoService.getById(recordId);
      return response.data;
    },
  });

  useEffect(() => {
    if (!query.isError) return;
    showApiError(query.error, ERROR_MESSAGES.LOAD_ERROR);
    onClose();
  }, [onClose, query.error, query.isError, showApiError]);

  if (!query.data) {
    return (
      <DraggableModal
        show
        onClose={onClose}
        title=""
        modalId={`entity-record-edit-${tipo}-${recordId}`}
      >
        <Loading variant="modal" />
      </DraggableModal>
    );
  }

  return (
    <DocumentoModal
      show
      tipo={tipo}
      documento={query.data}
      onClose={onClose}
      onSuccess={onClose}
    />
  );
}

const EntityRecordEditModal: React.FC<EntityRecordEditModalProps> = ({ kind, recordId, onClose }) => {
  let content: React.ReactNode = null;

  if (kind === 'plano') {
    content = <PlanoModal show planoId={recordId} onClose={onClose} onSuccess={onClose} />;
  } else if (kind === 'banco') {
    content = <BancoModal show bancoId={recordId} onClose={onClose} onSuccess={onClose} />;
  } else if (kind === 'tipoCobranca') {
    content = <TipoCobrancaContratoModal show tipoId={recordId} onClose={onClose} onSuccess={onClose} />;
  } else if (kind === 'cliente') {
    content = <ClienteModal show clienteId={recordId} onClose={onClose} onSuccess={onClose} />;
  } else if (kind === 'fornecedor') {
    content = <FornecedorModal show fornecedorId={recordId} onClose={onClose} onSuccess={onClose} />;
  } else if (kind === 'servidorEmail') {
    content = <ServidorEmailModal show servidorId={recordId} onClose={onClose} onSaved={onClose} />;
  } else if (kind === 'servidorWhatsapp') {
    content = <ServidorWhatsappModal show servidorId={recordId} onClose={onClose} onSaved={onClose} />;
  } else if (kind === 'contrato') {
    content = <ContratoModal show contratoId={recordId} onClose={onClose} onSuccess={onClose} />;
  } else if (kind === 'modeloContrato') {
    content = <ModeloDocumentoEdit recordId={recordId} tipo="contrato" onClose={onClose} />;
  } else if (kind === 'modeloTermo') {
    content = <ModeloDocumentoEdit recordId={recordId} tipo="termo" onClose={onClose} />;
  }

  return <Suspense fallback={null}>{content}</Suspense>;
};

export default EntityRecordEditModal;
