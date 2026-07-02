import React, { useState, useEffect, useMemo } from 'react';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { ContratoPlanoAdicional, CreateContratoPlanoAdicional, UpdateContratoPlanoAdicional } from 'services/contratoPlanoAdicionalService';
import { useCreateContratoPlanoAdicional, useUpdateContratoPlanoAdicional } from 'hooks/useContratoPlanosAdicionais';
import { usePlanos } from 'hooks/usePlanos';
import { Plano } from 'types/entities';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions } from 'components/ui';
import FormField from 'components/ui/FormField';
import EntitySelectField from 'components/ui/EntitySelectField';
import PlanoListModal from 'components/modals/planos/PlanoListModal';

interface ServicoAdicionalModalProps {
  show: boolean;
  onClose: () => void;
  editingServico: ContratoPlanoAdicional | null;
  contratoId: number;
  onSuccess?: () => void;
  onShowPlanoModal?: () => void;
}

const ServicoAdicionalModal: React.FC<ServicoAdicionalModalProps> = ({
  show,
  onClose,
  editingServico,
  contratoId,
  onSuccess,
  onShowPlanoModal
}) => {
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const createMutation = useCreateContratoPlanoAdicional();
  const updateMutation = useUpdateContratoPlanoAdicional();
  const { data: planosData } = usePlanos({ page: 1, limit: 1000 });

  const [planoId, setPlanoId] = useState<number>(0);
  const [descontoPercentual, setDescontoPercentual] = useState<number>(0);
  const [descontoValor, setDescontoValor] = useState<number>(0);
  const [status, setStatus] = useState<'ativo' | 'inativo' | 'suspenso'>('ativo');
  const [observacoes, setObservacoes] = useState<string>('');
  const [showPlanoModal, setShowPlanoModal] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano | null>(null);

  const planos: Plano[] = useMemo(() => {
    if (!planosData) return [];
    if (Array.isArray(planosData.data)) {
      return planosData.data;
    }
    if (planosData.data && typeof planosData.data === 'object' && 'data' in planosData.data && Array.isArray((planosData.data as { data: Plano[] }).data)) {
      return (planosData.data as { data: Plano[] }).data;
    }
    return [];
  }, [planosData]);

  useEffect(() => {
    if (editingServico) {
      setPlanoId(editingServico.plano_id);
      setDescontoPercentual(parseFloat(editingServico.desconto_percentual?.toString() || '0') || 0);
      setDescontoValor(parseFloat(editingServico.desconto_valor?.toString() || '0') || 0);
      setStatus(editingServico.status);
      setObservacoes(editingServico.observacoes || '');
      
      // Buscar plano selecionado
      const plano = planos.find(p => p.id === editingServico.plano_id);
      setPlanoSelecionado(plano || null);
    } else {
      setPlanoId(0);
      setDescontoPercentual(0);
      setDescontoValor(0);
      setStatus('ativo');
      setObservacoes('');
      setPlanoSelecionado(null);
    }
  }, [editingServico, planos]);

  const handlePlanoSelect = (plano: Plano) => {
    setPlanoSelecionado(plano);
    setPlanoId(plano.id);
    setShowPlanoModal(false);
    if (onShowPlanoModal) {
      onShowPlanoModal();
    }
  };

  const handleDescontoPercentualChange = (value: string | number) => {
    const percentual = typeof value === 'string' ? parseFloat(value) || 0 : value;
    setDescontoPercentual(Math.round(percentual * 100) / 100);
    setDescontoValor(0); // Limpar desconto em valor quando usar percentual
  };

  const handleDescontoValorChange = (value: string | number) => {
    const valor = typeof value === 'string' ? parseFloat(value) || 0 : value;
    setDescontoValor(Math.round(valor * 100) / 100);
    setDescontoPercentual(0); // Limpar desconto percentual quando usar valor
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!planoId || planoId === 0) {
      showApiError('Selecione um plano');
      return;
    }

    try {
      if (editingServico) {
        const updateData: UpdateContratoPlanoAdicional = {
          plano_id: planoId,
          desconto_percentual: descontoPercentual > 0 ? descontoPercentual : null,
          desconto_valor: descontoValor > 0 ? descontoValor : null,
          status,
          observacoes: observacoes || null
        };
        await updateMutation.mutateAsync({
          id: editingServico.id,
          data: updateData
        });
        success('Serviço adicional atualizado com sucesso');
      } else {
        const createData: CreateContratoPlanoAdicional = {
          contrato_id: contratoId,
          plano_id: planoId,
          desconto_percentual: descontoPercentual > 0 ? descontoPercentual : null,
          desconto_valor: descontoValor > 0 ? descontoValor : null,
          status,
          observacoes: observacoes || null
        };
        await createMutation.mutateAsync({
          contratoId,
          data: createData
        });
        success('Serviço adicional vinculado com sucesso');
      }

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.SERVICO_ADICIONAL_SAVE_ERROR);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const headerActions = (
    <ModalFormActions
      onCancel={onClose}
      formId="servico-adicional-form"
      isPending={isPending}
    />
  );

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Serviço Adicional"
        size="lg"
        headerActions={headerActions}
      >
        <form id="servico-adicional-form" onSubmit={handleSubmit} className="form-modal-simple">
          <div className="row g-2">
            <div className="col-12">
              <EntitySelectField
                value={planoId}
                onChange={(value) => {
                  const plano = planos.find((p: Plano) => p.id === value);
                  if (plano) {
                    handlePlanoSelect(plano);
                  }
                }}
                onShowModal={() => setShowPlanoModal(true)}
                entities={planos.map((p: Plano) => ({
                  id: p.id,
                  nome: p.nome_plano
                }))}
                label="Plano"
                idFieldTitle="Digite o ID do plano"
                helpText="Selecione um plano para vincular ao contrato"
                required
              />
            </div>

            {planoSelecionado && (
              <div className="col-12">
                <div className="alert alert-info p-2 small mb-0">
                  <strong>Plano selecionado:</strong> {planoSelecionado.nome_plano} - R$ {(parseFloat(planoSelecionado.valor_mensal?.toString() || '0') || 0).toFixed(2).replace('.', ',')}
                </div>
              </div>
            )}

            <div className="col-12">
              <FormField
                name="desconto_percentual"
                type="number"
                label="Desconto (%)"
                size="md"
                value={descontoPercentual}
                onChange={(value) => handleDescontoPercentualChange(value as number)}
                step="any"
                min={0}
                max={100}
              />
            </div>
            <div className="col-12">
              <FormField
                name="desconto_valor"
                type="number"
                label="Desconto (R$)"
                size="md"
                value={descontoValor}
                onChange={(value) => handleDescontoValorChange(value as number)}
                step={0.01}
                min={0}
              />
            </div>

            <div className="col-12">
              <FormField
                name="status"
                type="select"
                label="Status"
                size="md"
                value={status}
                onChange={(value) => setStatus(value as 'ativo' | 'inativo' | 'suspenso')}
                options={[
                  { value: 'ativo', label: 'Ativo' },
                  { value: 'inativo', label: 'Inativo' },
                  { value: 'suspenso', label: 'Suspenso' }
                ]}
              />
            </div>

            <div className="col-12">
              <FormField
                name="observacoes"
                type="textarea"
                label="Observações"
                size="md"
                value={observacoes}
                onChange={(value) => setObservacoes(value as string)}
              />
            </div>
          </div>
        </form>
      </DraggableModal>

      {showPlanoModal && (
        <PlanoListModal
          show={showPlanoModal}
          onClose={() => setShowPlanoModal(false)}
          onSelectPlano={handlePlanoSelect}
          title="Plano"
        />
      )}
    </>
  );
};

export default ServicoAdicionalModal;

