import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DraggableModal from 'components/common/DraggableModal';
import { Button, FormField } from 'components/ui';
import EntitySelectField from 'components/ui/EntitySelectField';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useI18n } from 'contexts/I18nContext';
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
  const { t } = useI18n();
  const [nome, setNome] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showClienteSelector, setShowClienteSelector] = useState(false);
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

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
      success('CA criada com sucesso');
      onClose();
    },
    onError: (err: unknown) => {
      const withMessage = err as { message?: string };
      error(withMessage.message || 'Erro ao criar CA');
    },
  });

  return (
    <DraggableModal show={show} onClose={onClose} title="Novo CA" size="sm" modalId="rpki-ca-create-modal">
      <div className="p-2">
        <FormField
          name="rpki_ca_nome"
          label="Nome da CA"
          size="sm"
          value={nome}
          onChange={(v) => setNome(String(v ?? ''))}
        />
        {defaultClienteId == null && (
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
                        nome: selectedCliente.razao_social || selectedCliente.nome_fantasia || '',
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
        )}
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
                clienteId: defaultClienteId ?? selectedCliente?.id ?? null,
              })
            }
          >
            {t('buttons.new')}
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
