import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { Button, FormField } from 'components/ui';
import EntitySelectField from 'components/ui/EntitySelectField';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { RpkiCaService } from 'services/rpkiCaService';
import { Cliente } from 'types';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';

interface RpkiCaCreateModalProps {
  show: boolean;
  onClose: () => void;
}

const RpkiCaCreateModal: React.FC<RpkiCaCreateModalProps> = ({ show, onClose }) => {
  const [nome, setNome] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showClienteSelector, setShowClienteSelector] = useState(false);
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  useEffect(() => {
    if (show) {
      setNome('');
      setSelectedCliente(null);
    }
  }, [show]);

  const createMutation = useMutation({
    mutationFn: (payload: { nome: string; clienteId?: number | null }) => RpkiCaService.create(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rpki-cas'] });
      success('CA criada com sucesso');
      onClose();
    },
    onError: (err: unknown) => {
      const withMessage = err as { message?: string };
      error(withMessage.message || 'Erro ao criar CA');
    },
  });

  return (
    <DraggableModal show={show} onClose={onClose} title="Nova CA" size="sm" modalId="rpki-ca-create-modal">
      <div className="p-2">
        <FormField
          name="rpki_ca_nome"
          label="Nome da CA"
          size="sm"
          value={nome}
          onChange={(v) => setNome(String(v ?? ''))}
        />
        <div className="mt-2">
          <EntitySelectField
            value={selectedCliente?.id || 0}
            onChange={(id) => {
              if (!id) setSelectedCliente(null);
            }}
            onShowModal={() => setShowClienteSelector(true)}
            entities={
              selectedCliente
                ? [
                    {
                      id: selectedCliente.id,
                      nome: selectedCliente.nome_fantasia || selectedCliente.razao_social,
                    },
                  ]
                : []
            }
            label="Cliente"
            searchButtonTitle="Selecionar cliente"
          />
          <div className="d-flex gap-2 mt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!selectedCliente}
              onClick={() => setSelectedCliente(null)}
            >
              Limpar
            </Button>
          </div>
        </div>
        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={createMutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={createMutation.isPending || !nome.trim()}
            onClick={() =>
              createMutation.mutate({
                nome: nome.trim(),
                clienteId: selectedCliente?.id ?? null,
              })
            }
          >
            Salvar
          </Button>
        </div>
      </div>
      <ClienteListModal
        show={showClienteSelector}
        onClose={() => setShowClienteSelector(false)}
        onSelectClient={(cliente) => {
          setSelectedCliente(cliente);
          setShowClienteSelector(false);
        }}
      />
    </DraggableModal>
  );
};

export default RpkiCaCreateModal;
