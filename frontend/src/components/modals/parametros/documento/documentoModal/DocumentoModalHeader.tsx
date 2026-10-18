import React, { useMemo } from 'react';
import type { TranslationKeys } from 'contexts/I18nContext';
import { CancelarButton, ImprimirButton, SalvarButton, AppMenuDropdown } from 'components/ui';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { useI18n } from 'contexts/I18nContext';
import { DocumentoModalProps } from '../types';
import { DocumentoActiveTab } from './constants';

interface DocumentoModalHeaderProps {
  tipo: DocumentoModalProps['tipo'];
  isMobile: boolean;
  isEditing: boolean;
  activeTab: DocumentoActiveTab;
  setActiveTab: (tab: DocumentoActiveTab) => void;
  showImprimirDropdown: boolean;
  setShowImprimirDropdown: (show: boolean) => void;
  isSubmitting: boolean;
  tipoLabel: string;
  onPrint: (documentoTipo?: DocumentoActiveTab) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

const CONTRATO_TABS: { id: DocumentoActiveTab; labelKey: keyof TranslationKeys }[] = [
  { id: 'contrato', labelKey: 'document.modelContrato' },
  { id: 'adesao', labelKey: 'document.termAdesao' },
  { id: 'permanencia', labelKey: 'document.permanencia' },
  { id: 'recibo', labelKey: 'document.receipts' },
  { id: 'carta', labelKey: 'document.cartaCobranca' },
];

const CONTRATO_PRINT_OPTIONS: { tipo: DocumentoActiveTab; labelKey: keyof TranslationKeys }[] = [
  { tipo: 'contrato', labelKey: 'document.modelContrato' },
  { tipo: 'adesao', labelKey: 'document.termAdesao' },
  { tipo: 'permanencia', labelKey: 'document.permanencia' },
  { tipo: 'recibo', labelKey: 'document.receipts' },
  { tipo: 'carta', labelKey: 'document.cartaCobranca' },
];

function DocumentoModalHeader({
  tipo,
  isMobile,
  isEditing,
  activeTab,
  setActiveTab,
  showImprimirDropdown,
  setShowImprimirDropdown,
  isSubmitting,
  tipoLabel,
  onPrint,
  onSubmit,
  onClose,
}: DocumentoModalHeaderProps) {
  const { t } = useI18n();

  const tabs = useMemo(
    (): ModalTabItem<DocumentoActiveTab>[] =>
      CONTRATO_TABS.map(({ id, labelKey }) => ({ id, label: t(labelKey) })),
    [t]
  );

  const printItems = useMemo(() => {
    if (tipo === 'contrato') {
      return CONTRATO_PRINT_OPTIONS.map(({ tipo: docTipo, labelKey }) => ({
        key: docTipo,
        label: t(labelKey),
        onClick: () => onPrint(docTipo),
        disabled: !isEditing,
      }));
    }
    return [
      {
        key: 'current',
        label: tipoLabel,
        onClick: () => onPrint(),
        disabled: !isEditing,
      },
    ];
  }, [isEditing, onPrint, t, tipo, tipoLabel]);

  const imprimirDropdown = (
    <AppMenuDropdown
      open={showImprimirDropdown}
      onOpenChange={setShowImprimirDropdown}
      align="start"
      trigger={<ImprimirButton type="button" disabled={!isEditing} />}
      items={printItems}
    />
  );

  const actionButtons = (
    <>
      {isEditing && imprimirDropdown}
      <SalvarButton type="button" onClick={onSubmit} isPending={isSubmitting} />
      <CancelarButton type="button" onClick={onClose} />
    </>
  );

  if (tipo === 'contrato') {
    return (
      <div className="documento-header-unified">
        <div className="documento-header-buttons modal-header-actions">{actionButtons}</div>
        <div className="documento-header-tabs">
          <ModalTabsOverflow
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabsClassName={`documento-tabs documento-tabs-unified ${isMobile ? 'documento-tabs-mobile' : ''}`}
            isMobile={isMobile}
            id="documentoTab"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex gap-2 align-items-center">{actionButtons}</div>
  );
}

export default DocumentoModalHeader;
