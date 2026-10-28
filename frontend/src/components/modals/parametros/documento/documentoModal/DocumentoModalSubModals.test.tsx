import React from 'react';
import { render, screen } from '@testing-library/react';
import DocumentoModalSubModals from './DocumentoModalSubModals';

jest.mock('contexts/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

jest.mock('components/common/ImprimirModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('components/modals/clientes/ClienteListModal', () => ({
  __esModule: true,
  default: () => <div>lista-clientes</div>,
}));

const baseProps = {
  isEditing: false,
  showPreview: false,
  pdfUrl: null,
  isGeneratingPdf: false,
  onClosePreview: jest.fn(),
  onCloseClienteModal: jest.fn(),
  onSelectCliente: jest.fn(),
};

it('não monta a lista de clientes enquanto o seletor está fechado', () => {
  render(<DocumentoModalSubModals {...baseProps} showClienteModal={false} />);
  expect(screen.queryByText('lista-clientes')).toBeNull();
});

it('monta a lista de clientes quando o seletor abre', () => {
  render(<DocumentoModalSubModals {...baseProps} showClienteModal />);
  expect(screen.getByText('lista-clientes')).toBeTruthy();
});
