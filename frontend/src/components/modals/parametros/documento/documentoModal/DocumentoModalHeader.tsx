import React, { useMemo } from 'react';
import type { TranslationKeys } from 'contexts/I18nContext';
import { CancelarButton, ImprimirButton, SalvarButton } from 'components/ui';
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

function stopDropdownEvent(e: React.MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
}

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

  const handleToggleDropdown = (e: React.MouseEvent) => {
    stopDropdownEvent(e);
    setShowImprimirDropdown(!showImprimirDropdown);
  };

  const handlePrintOption = (e: React.MouseEvent, documentoTipo?: DocumentoActiveTab) => {
    stopDropdownEvent(e);
    setShowImprimirDropdown(false);
    onPrint(documentoTipo);
  };

  const imprimirDropdown = (
    <div className="dropdown">
      <ImprimirButton
        className="dropdown-toggle"
        type="button"
        onClick={handleToggleDropdown}
        disabled={!isEditing}
      />
      {showImprimirDropdown && (
        <ul className="dropdown-menu show dropdown-menu-block" >
          {tipo === 'contrato'
            ? CONTRATO_PRINT_OPTIONS.map(({ tipo: docTipo, labelKey }) => (
                <li key={docTipo}>
                  <button
                    className="dropdown-item"
                    type="button"
                    onClick={(e) => handlePrintOption(e, docTipo)}
                    disabled={!isEditing}
                  >
                    {t(labelKey)}
                  </button>
                </li>
              ))
            : (
                <li>
                  <button
                    className="dropdown-item"
                    type="button"
                    onClick={(e) => handlePrintOption(e)}
                    disabled={!isEditing}
                  >
                    {tipoLabel}
                  </button>
                </li>
              )}
        </ul>
      )}
    </div>
  );

  const actionButtons = (
    <>
      {imprimirDropdown}
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
            tabsClassName={`documento-tabs-unified ${isMobile ? 'documento-tabs-mobile' : ''}`}
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
