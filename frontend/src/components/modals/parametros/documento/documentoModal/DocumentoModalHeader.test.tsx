import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DocumentoModalHeader from './DocumentoModalHeader';

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('components/common/ModalTabsOverflow', () => ({
  __esModule: true,
  default: () => <div data-testid="tabs" />,
}));

describe('DocumentoModalHeader', () => {
  const baseProps = {
    tipo: 'contrato' as const,
    isMobile: false,
    isEditing: true,
    activeTab: 'contrato' as const,
    setActiveTab: jest.fn(),
    showImprimirDropdown: false,
    setShowImprimirDropdown: jest.fn(),
    isSubmitting: false,
    tipoLabel: 'Modelo',
    onPrint: jest.fn(),
    onSubmit: jest.fn(),
    onClose: jest.fn(),
  };

  it('abre o menu de imprimir alinhado ao botão', () => {
    const setShowImprimirDropdown = jest.fn();

    const { rerender } = render(
      <DocumentoModalHeader {...baseProps} setShowImprimirDropdown={setShowImprimirDropdown} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'buttons.print' }));
    expect(setShowImprimirDropdown).toHaveBeenCalledWith(true);

    rerender(
      <DocumentoModalHeader
        {...baseProps}
        showImprimirDropdown
        setShowImprimirDropdown={setShowImprimirDropdown}
      />
    );

    expect(screen.getByRole('menuitem', { name: 'document.termAdesao' })).toBeTruthy();
  });

  it('escolhe uma opção e dispara a impressão', () => {
    const onPrint = jest.fn();
    const setShowImprimirDropdown = jest.fn();

    render(
      <DocumentoModalHeader
        {...baseProps}
        showImprimirDropdown
        setShowImprimirDropdown={setShowImprimirDropdown}
        onPrint={onPrint}
      />
    );

    fireEvent.click(screen.getByRole('menuitem', { name: 'document.modelContrato' }));
    expect(setShowImprimirDropdown).toHaveBeenCalledWith(false);
    expect(onPrint).toHaveBeenCalledWith('contrato');
  });
});
