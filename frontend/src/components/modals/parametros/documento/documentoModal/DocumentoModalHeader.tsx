import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TranslationKeys } from 'contexts/I18nContext';
import { CancelarButton, ImprimirButton, SalvarButton, DropdownItemButton, PositionedFixed } from 'components/ui';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { useI18n } from 'contexts/I18nContext';
import { computeFixedDropdownPosition } from 'utils/fixedDropdownPosition';
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const tabs = useMemo(
    (): ModalTabItem<DocumentoActiveTab>[] =>
      CONTRATO_TABS.map(({ id, labelKey }) => ({ id, label: t(labelKey) })),
    [t]
  );

  const calculateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = dropdownRef.current?.getBoundingClientRect();
    setDropdownPosition(
      computeFixedDropdownPosition(triggerRect, {
        align: 'start',
        menuWidth: menuRect?.width ?? 200,
        menuHeight: menuRect?.height,
      })
    );
  }, []);

  const handleToggleDropdown = (e: React.MouseEvent) => {
    stopDropdownEvent(e);
    if (!showImprimirDropdown) {
      calculateDropdownPosition();
      setShowImprimirDropdown(true);
      return;
    }
    setShowImprimirDropdown(false);
  };

  const handlePrintOption = (e: React.MouseEvent, documentoTipo?: DocumentoActiveTab) => {
    stopDropdownEvent(e);
    setShowImprimirDropdown(false);
    onPrint(documentoTipo);
  };

  useEffect(() => {
    if (!showImprimirDropdown) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setShowImprimirDropdown(false);
    };

    const handleScrollOrResize = () => {
      calculateDropdownPosition();
    };

    const timeoutId = window.setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [calculateDropdownPosition, setShowImprimirDropdown, showImprimirDropdown]);

  const printOptions =
    tipo === 'contrato'
      ? CONTRATO_PRINT_OPTIONS.map(({ tipo: docTipo, labelKey }) => ({
          key: docTipo,
          label: t(labelKey),
          onClick: (e: React.MouseEvent) => handlePrintOption(e, docTipo),
        }))
      : [
          {
            key: 'current',
            label: tipoLabel,
            onClick: (e: React.MouseEvent) => handlePrintOption(e),
          },
        ];

  const imprimirDropdown = (
    <div className="documento-imprimir-dropdown" ref={triggerRef}>
      <ImprimirButton
        type="button"
        onClick={handleToggleDropdown}
        disabled={!isEditing}
        aria-expanded={showImprimirDropdown}
        aria-haspopup="menu"
      />
      {showImprimirDropdown &&
        createPortal(
          <PositionedFixed
            left={dropdownPosition.left}
            top={dropdownPosition.top}
            className="documento-imprimir-dropdown-menu"
          >
            <ul ref={dropdownRef} className="dropdown-menu show" role="menu">
              {printOptions.map((option) => (
                <li key={option.key} role="none">
                  <DropdownItemButton
                    label={option.label}
                    role="menuitem"
                    onClick={option.onClick}
                    disabled={!isEditing}
                  />
                </li>
              ))}
            </ul>
          </PositionedFixed>,
          document.body
        )}
    </div>
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
