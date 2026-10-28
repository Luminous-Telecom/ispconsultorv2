import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { FormField } from 'components/ui';
import { CancelarButton, LimparButton, NovoButton } from 'components/ui';
import EntitySelectField from 'components/ui/EntitySelectField';
import { useEntityRecordEdit } from 'hooks/useEntityRecordEdit';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { RpkiCaService } from 'services/rpkiCaService';
import { Cliente } from 'types';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';
import { ClienteService } from 'services/clienteService';

interface RpkiCaCreateModalProps {
  show: boolean;
  onClose: () => void;
  defaultClienteId?: number;
}

const RpkiCaCreateModal: React.FC<RpkiCaCreateModalProps> = ({ show, onClose, defaultClienteId }) => {
  const clienteEdit = useEntityRecordEdit('cliente');
  const [nome, setNome] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showClienteSelector, setShowClienteSelector] = useState(false);
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();

  const { data: defaultCliente } = useQuery({
    queryKey: ['cliente', defaultClienteId],
    queryFn: () => ClienteService.getById(defaultClienteId!),
    enabled: show && defaultClienteId != null && defaultClienteId > 0,
  });

  useEffect(() => {
    if (!show) return;
    setNome('');
    if (defaultClienteId != null && defaultCliente) {
      setSelectedCliente(defaultCliente);
    } else if (defaultClienteId == null) {
      setSelectedCliente(null);
    }
  }, [show, defaultClienteId, defaultCliente]);

  const createMutation = useMutation({
    mutationFn: (payload: { nome: string; clienteId?: number | null }) => RpkiCaService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rpki-cas'] });
      success('CA salva com sucesso');
      onClose();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_CA_CREATE_ERROR),
  });

  const handleSubmit = (event?: React.SyntheticEvent) => {
    event?.preventDefault();
    if (createMutation.isPending || !nome.trim()) return;
    createMutation.mutate({
      nome: nome.trim(),
      clienteId: defaultClienteId ?? selectedCliente?.id ?? null,
    });
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="CA"
      size="sm"
      modalId="rpki-ca-create-modal"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <CancelarButton type="button" onClick={onClose} isPending={createMutation.isPending} />
          <NovoButton
            type="button"
            disabled={createMutation.isPending || !nome.trim()}
            isPending={createMutation.isPending}
            onClick={handleSubmit}
          />
        </div>
      }
    >
      <form id="rpki-ca-create-form" className="form-modal-simple" onSubmit={handleSubmit}>
        <div className="row g-2">
          <div className="col-12">
            <FormField
              name="rpki_ca_nome"
              label="Nome da CA"
              size="sm"
              required
              value={nome}
              onChange={(v) => setNome(String(v ?? ''))}
            />
          </div>
          {defaultClienteId == null && (
            <div className="col-12">
              <EntitySelectField
                value={selectedCliente?.id || 0}
                onChange={(id) => {
                  if (!id) setSelectedCliente(null);
                }}
                onShowModal={() => setShowClienteSelector(true)}
                onEdit={() => clienteEdit.open(selectedCliente?.id || 0)}
                entities={
                  selectedCliente
                    ? [
                        {
                          id: selectedCliente.id,
                          nome: selectedCliente.razao_social || selectedCliente.nome_fantasia || '',
                        },
                      ]
                    : []
                }
                label="Cliente"
                searchButtonTitle="Cliente"
              />
              <div className="form-modal-input-col">
                <LimparButton
                  type="button"
                  disabled={!selectedCliente}
                  onClick={() => setSelectedCliente(null)}
                />
              </div>
            </div>
          )}
        </div>
      </form>
      <ClienteListModal
        show={showClienteSelector}
        onClose={() => setShowClienteSelector(false)}
        onSelectClient={(cliente) => {
          setSelectedCliente(cliente);
          setShowClienteSelector(false);
        }}
      />
      {clienteEdit.modal}
    </DraggableModal>
  );
};

export default RpkiCaCreateModal;
