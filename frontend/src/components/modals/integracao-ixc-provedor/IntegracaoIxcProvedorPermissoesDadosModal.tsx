import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { FecharButton, FormField, Spinner } from 'components/ui';
import {
  IntegracaoIxcProvedorService,
  type IxcPermissionFormRow,
} from 'services/integracaoIxcProvedorService';

interface IntegracaoIxcProvedorPermissoesDadosModalProps {
  show: boolean;
  onClose: () => void;
  integracaoId?: number | null;
  row: IxcPermissionFormRow | null;
}

const noopChange = () => undefined;

const IntegracaoIxcProvedorPermissoesDadosModal: React.FC<IntegracaoIxcProvedorPermissoesDadosModalProps> = ({
  show,
  onClose,
  integracaoId,
  row,
}) => {
  const {
    data: sampleData,
    isLoading,
    error: sampleError,
  } = useQuery({
    queryKey: ['ixc-permissions-dados', integracaoId, row?.id],
    queryFn: () => IntegracaoIxcProvedorService.checkPermissionsDados(integracaoId!, row!.id),
    enabled: show && integracaoId != null && row != null,
    staleTime: 0,
  });

  const sampleLines = useMemo(() => {
    if (!sampleData || sampleData.items.length === 0) return '';
    return sampleData.items.map((item) => `${item.id} — ${item.texto}`).join('\n');
  }, [sampleData]);

  const infoMessage = sampleData?.message;

  if (!row) return null;

  const title = `Dados — ${row.formulario}`;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={title}
      size="lg"
      modalId="integracao-ixc-provedor-permissoes-dados-modal"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <FecharButton type="button" onClick={onClose} disabled={isLoading} />
        </div>
      }
    >
      <div className="p-3 logs-auditoria-details">
        <div className="row g-2">
          <div className="col-md-4">
            <FormField
              name="ixc_perm_resource"
              type="text"
              label="Recurso API"
              value={sampleData?.resource ?? row.id}
              onChange={noopChange}
              size="sm"
              readOnly
            />
          </div>
          <div className="col-md-4">
            <FormField
              name="ixc_perm_total"
              type="text"
              label="Total na API"
              value={
                sampleData?.total != null
                  ? String(sampleData.total)
                  : row.dados != null
                    ? String(row.dados)
                    : '—'
              }
              onChange={noopChange}
              size="sm"
              readOnly
            />
          </div>
          <div className="col-md-4">
            <FormField
              name="ixc_perm_listar"
              type="text"
              label="Listar"
              value={
                row.listar === 'liberado'
                  ? 'Liberado'
                  : row.listar === 'bloqueado'
                    ? 'Bloqueado'
                    : '—'
              }
              onChange={noopChange}
              size="sm"
              readOnly
            />
          </div>
        </div>

        {isLoading ? (
          <div className="d-flex align-items-center gap-2 py-3">
            <Spinner size="sm" />
            <span className="small">Consultando dados na API IXC...</span>
          </div>
        ) : sampleError ? (
          <div className="alert alert-danger mt-3 mb-0 py-2 small">
            {sampleError instanceof Error ? sampleError.message : 'Erro ao buscar dados'}
          </div>
        ) : (
          <div className="mt-3">
            <FormField
              name="ixc_perm_dados_amostra"
              type="textarea"
              label="Registros retornados"
              helpText={infoMessage}
              value={sampleLines}
              onChange={noopChange}
              size="sm"
              readOnly
              rows={Math.min(12, Math.max(4, sampleData?.items.length ?? 4))}
              placeholder={infoMessage && !sampleLines ? 'Sem registros para exibir.' : undefined}
            />
          </div>
        )}
      </div>
    </DraggableModal>
  );
};

export default IntegracaoIxcProvedorPermissoesDadosModal;
