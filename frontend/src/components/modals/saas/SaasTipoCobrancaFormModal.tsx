import React from 'react';
import DraggableModal from 'components/common/DraggableModal';
import { ModalFormActions } from 'components/ui';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useEntityFormModal } from 'hooks/useEntityFormModal';
import { saasTipoCobrancaService, type SaasTipoCobranca } from 'services/saas/saasCrudService';
import TipoCobrancaFormFields, {
  type TipoCobrancaFormData,
} from 'components/modals/tipoCobrancaContrato/TipoCobrancaFormFields';
import { validateTipoCobrancaForm } from 'utils/tipoCobrancaFormValidation';

interface SaasTipoCobrancaFormModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  itemId?: number | null;
}

const INITIAL: TipoCobrancaFormData = {
  nome: '',
  quantidade_titulos: 1,
  periodicidade: 'mensal',
  ativo: true,
};

const SaasTipoCobrancaFormModal: React.FC<SaasTipoCobrancaFormModalProps> = ({
  show,
  onClose,
  onSuccess,
  itemId,
}) => {
  const { form, errors, isPending, handleChange, handleSubmit } = useEntityFormModal<
    TipoCobrancaFormData,
    Partial<SaasTipoCobranca>
  >({
    show,
    entityId: itemId,
    initialForm: INITIAL,
    queryKey: 'saas-tipo-cobranca',
    loadById: (id) => saasTipoCobrancaService.getById(id),
    mapEntityToForm: (entity) => {
      const tipo = entity as SaasTipoCobranca;
      return {
        nome: tipo.nome,
        quantidade_titulos: tipo.quantidade_titulos ?? 1,
        periodicidade: tipo.periodicidade ?? 'mensal',
        ativo: tipo.ativo ?? true,
      };
    },
    validate: (f) =>
      validateTipoCobrancaForm(f, {
        nomeRequired: 'Nome é obrigatório',
        quantidadeRange: 'Quantidade deve ser entre 1 e 999',
      }),
    toPayload: (f) => ({
      nome: f.nome,
      quantidade_titulos: f.quantidade_titulos,
      periodicidade: f.periodicidade as SaasTipoCobranca['periodicidade'],
      ativo: f.ativo,
    }),
    create: (payload) => saasTipoCobrancaService.create(payload),
    update: (id, payload) => saasTipoCobrancaService.update(id, payload),
    invalidateQueryKeys: ['saas-tipos-cobranca'],
    messages: {
      createSuccess: 'Tipo de cobrança criado',
      updateSuccess: 'Tipo de cobrança atualizado',
      createError: CONTEXT_ERROR_MESSAGES.TIPO_COBRANCA_CREATE_ERROR,
      updateError: CONTEXT_ERROR_MESSAGES.TIPO_COBRANCA_UPDATE_ERROR,
    },
    onSuccess,
    onClose,
  });

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Tipo de Cobrança"
      size="md"
      modalId="saas-tipo-cobranca-form"
      headerActions={
        <ModalFormActions
          onCancel={onClose}
          formId="saas-tipo-cobranca-form-id"
          isPending={isPending}
        />
      }
    >
      <form id="saas-tipo-cobranca-form-id" onSubmit={handleSubmit} className="form-modal-simple">
        <TipoCobrancaFormFields
          form={form}
          errors={errors}
          onChange={handleChange}
          disabled={isPending}
          ativoFieldName="saas-tipo-cobranca-ativo"
        />
      </form>
    </DraggableModal>
  );
};

export default SaasTipoCobrancaFormModal;
