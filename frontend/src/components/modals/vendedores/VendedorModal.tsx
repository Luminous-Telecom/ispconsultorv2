import React, { useMemo, useState } from 'react';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { CancelarButton, Loading, SalvarButton } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useCreateVendedor, useUpdateVendedor, useVendedor } from 'hooks/useVendedores';
import { useFormReset } from 'hooks/useFormReset';
import { formatDateTime } from 'utils/formatters';
import { withInvalidTabs } from 'utils/tabValidation';
import VendedorBancoTab from './VendedorBancoTab';
import VendedorDadosTab from './VendedorDadosTab';
import {
  initialVendedorForm,
  validateVendedorForm,
  vendedorFormToPayload,
  type VendedorFormData,
  type VendedorTab,
} from './vendedorForm';

interface VendedorModalProps {
  show: boolean;
  onClose: () => void;
  vendedorId?: number | null;
  onSuccess?: () => void;
}

function toText(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

const VendedorModal: React.FC<VendedorModalProps> = ({ show, onClose, vendedorId, onSuccess }) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const isEdit = !!vendedorId;
  const [activeTab, setActiveTab] = useState<VendedorTab>('dados');
  const [formData, setFormData] = useState<VendedorFormData>(initialVendedorForm);
  const [errors, setErrors] = useState<Partial<Record<keyof VendedorFormData, string>>>({});

  const { data: vendedor, isLoading } = useVendedor(vendedorId ?? null);
  const createMutation = useCreateVendedor();
  const updateMutation = useUpdateVendedor();
  const isPending = createMutation.isPending || updateMutation.isPending;

  useFormReset({
    show,
    initialData: initialVendedorForm,
    setFormData,
    customData: vendedor
      ? {
          nome: vendedor.nome || '',
          comissao_percentual: toText(vendedor.comissao_percentual),
          comissao_valor: toText(vendedor.comissao_valor),
          cep: vendedor.cep || '',
          endereco: vendedor.endereco || '',
          numero: vendedor.numero || '',
          complemento: vendedor.complemento || '',
          bairro: vendedor.bairro || '',
          cidade: vendedor.cidade || '',
          estado: vendedor.estado || '',
          telefone: vendedor.telefone || '',
          celular: vendedor.celular || '',
          cpf_cnpj: vendedor.cpf_cnpj || '',
          email: vendedor.email || '',
          ativo: vendedor.ativo !== false,
          forma_recebimento: vendedor.forma_recebimento || '',
          tipo_conta: vendedor.tipo_conta || '',
          banco_nome: vendedor.banco_nome || '',
          codigo_banco: vendedor.codigo_banco || '',
          tipo_chave_pix: vendedor.tipo_chave_pix || '',
          chave_pix: vendedor.chave_pix || '',
          tipo_pessoa_titular: vendedor.tipo_pessoa_titular || '',
          nome_titular: vendedor.nome_titular || '',
          cpf_cnpj_titular: vendedor.cpf_cnpj_titular || '',
          agencia: vendedor.agencia || '',
          digito_agencia: vendedor.digito_agencia || '',
          conta: vendedor.conta || '',
          digito_conta: vendedor.digito_conta || '',
          codigo_operacao: vendedor.codigo_operacao || '',
        }
      : undefined,
  });

  const tabs = useMemo(
    (): ModalTabItem<VendedorTab>[] => withInvalidTabs([
      { id: 'dados', label: t('vendedor.tabMain') },
      { id: 'banco', label: t('vendedor.tabBank') },
    ], errors, {
      dados: ['nome', 'comissao_percentual', 'email'],
      banco: [],
    }),
    [errors, t]
  );

  const handleChange = (field: keyof VendedorFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateVendedorForm(formData, {
      nomeRequired: t('messages.sellerNameRequired'),
      commissionRange: t('messages.sellerCommissionRange'),
      emailInvalid: t('form.invalidEmail'),
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setActiveTab('dados');
      return;
    }

    const payload = vendedorFormToPayload(formData);
    try {
      if (isEdit && vendedorId) {
        await updateMutation.mutateAsync({ id: vendedorId, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onSuccess?.();
    } catch {
      // erro tratado pelo hook
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={isEdit ? t('modal.editSeller') : t('modal.sellers')}
      size="lg"
      modalId="vendedor-modal"
      headerActions={(
        <div className="vendedor-header-unified">
          <div className="vendedor-header-buttons modal-header-actions">
            <CancelarButton type="button" onClick={onClose} isPending={isPending} />
            <SalvarButton type="submit" form="vendedor-form" isPending={isPending} />
          </div>
          <div className="vendedor-header-tabs">
            <ModalTabsOverflow
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabsClassName={`vendedor-tabs-unified ${isMobile ? 'vendedor-tabs-mobile' : ''}`}
              isMobile={isMobile}
              id="vendedorTab"
            />
          </div>
        </div>
      )}
    >
      {isEdit && isLoading ? (
        <Loading variant="modal" />
      ) : (
        <form id="vendedor-form" onSubmit={handleSubmit} className="form-modal-simple">
          <div className="vendedor-modal-content">
            <div className="tab-content vendedor-tab-content vendedor-tab-content-padded">
              {activeTab === 'dados' ? (
                <VendedorDadosTab
                  entityId={vendedorId}
                  form={formData}
                  errors={errors}
                  updatedAt={vendedor?.updated_at ? formatDateTime(vendedor.updated_at) : ''}
                  disabled={isPending}
                  onChange={handleChange}
                />
              ) : (
                <VendedorBancoTab form={formData} disabled={isPending} onChange={handleChange} />
              )}
            </div>
          </div>
        </form>
      )}
    </DraggableModal>
  );
};

export default VendedorModal;
