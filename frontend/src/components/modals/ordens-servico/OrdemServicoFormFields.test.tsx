import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import OrdemServicoFormFields, { initialOrdemServicoForm } from './OrdemServicoFormFields';

jest.mock('components/ui/EntitySelectField', () => ({
  __esModule: true,
  default: () => <div />,
}));

function renderForm(ui: React.ReactElement) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <NotificationProvider>{ui}</NotificationProvider>
    </I18nProvider>
  );
}

describe('OrdemServicoFormFields', () => {
  it('começa sem mensagem', () => {
    expect(initialOrdemServicoForm.mensagem).toBe('');
    renderForm(
      <OrdemServicoFormFields
        form={initialOrdemServicoForm}
        errors={{}}
        onChange={jest.fn()}
      />
    );
    expect((screen.getByLabelText('Mensagem / Descrição') as HTMLTextAreaElement).value).toBe('');
  });

  it('alterar a prioridade dispara o callback', () => {
    const onChange = jest.fn();
    renderForm(
      <OrdemServicoFormFields
        form={{ ...initialOrdemServicoForm }}
        errors={{}}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText('Prioridade'), { target: { value: 'A' } });
    expect(onChange).toHaveBeenCalledWith('prioridade', 'A');
  });
});
