import React, { useMemo } from 'react';
import { useI18n } from 'contexts/I18nContext';
import { ImprimirButton, ModalFormActions } from 'components/ui';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { withInvalidTabs } from 'utils/tabValidation';

const CONTRACT_FINANCE_TABS = new Set(['financeiro', 'financeiro-avulso']);

interface ContratoModalHeaderProps {
  isEditMode: boolean;
  isMobile: boolean;
  activeTab: string;
  isSubmitting: boolean;
  showFinanceTabs?: boolean;
  formId?: string;
  invalidFields?: readonly string[];
  onClose: () => void;
  onPrintContract: () => void;
  onTabChange: (tab: string) => void;
}

function ContratoModalHeader({
  isEditMode,
  isMobile,
  activeTab,
  isSubmitting,
  showFinanceTabs = true,
  formId = 'contrato-form',
  invalidFields,
  onClose,
  onPrintContract,
  onTabChange,
}: ContratoModalHeaderProps) {
  const { t } = useI18n();

  const tabs = useMemo((): ModalTabItem[] => {
    const items: ModalTabItem[] = [
      { id: 'contrato', label: t('tabs.contractData') },
      { id: 'endereco', label: t('tabs.address') },
      { id: 'termos', label: t('tabs.terms'), disabled: !isEditMode },
      { id: 'financeiro', label: t('tabs.financial'), disabled: !isEditMode },
      { id: 'financeiro-avulso', label: t('tabs.financialMisc'), disabled: !isEditMode },
      { id: 'servicos-adicionais', label: t('tabs.additionalServices'), disabled: !isEditMode },
      { id: 'ixc-provedor', label: t('tabs.ixcProvedor'), disabled: !isEditMode },
    ];
    const visible = showFinanceTabs ? items : items.filter((tab) => !CONTRACT_FINANCE_TABS.has(tab.id));
    return withInvalidTabs(visible, invalidFields, {
      contrato: [
        'cliente_id',
        'plano_id',
        'modelo_documento_id',
        'dia_vencimento_id',
        'conta_boleto',
        'tipo_cobranca_contrato_id',
        'data_inicio',
        'data_fim',
        'desconto_percentual',
        'desconto_valor',
        'data_validade_desconto',
        'status',
        'observacoes',
      ],
      endereco: ['endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado'],
    });
  }, [invalidFields, isEditMode, showFinanceTabs, t]);

  const handleTabChange = (tab: string) => {
    const requiresEdit = tab !== 'contrato' && tab !== 'endereco';
    if (requiresEdit && !isEditMode) return;
    onTabChange(tab);
  };

  return (
    <div className="contrato-header-unified">
      <div className="contrato-header-buttons modal-header-actions d-flex gap-2 flex-wrap">
        {isEditMode && (
          <ImprimirButton
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPrintContract();
            }}
          />
        )}
        <ModalFormActions
          className="d-flex gap-2"
          onCancel={onClose}
          formId={formId}
          isPending={isSubmitting}
        />
      </div>
      <div className="contrato-header-tabs">
        <ModalTabsOverflow
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabsClassName={`contrato-tabs contrato-tabs-unified ${isMobile ? 'contrato-tabs-mobile' : ''}`}
          disabledClassName="contrato-tab-disabled"
          isMobile={isMobile}
          id="contratoTab"
        />
      </div>
    </div>
  );
}

export default ContratoModalHeader;
