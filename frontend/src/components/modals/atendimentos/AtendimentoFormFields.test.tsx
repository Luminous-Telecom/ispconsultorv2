import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import AtendimentoFormFields, { initialAtendimentoForm } from './AtendimentoFormFields';

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

describe('AtendimentoFormFields', () => {
  it('começa com a descrição vazia', () => {
    expect(initialAtendimentoForm.menssagem).toBe('');
    expect(initialAtendimentoForm.prioridade).toBe('N');
    renderForm(
      <AtendimentoFormFields
        form={initialAtendimentoForm}
        errors={{}}
        onChange={jest.fn()}
      />
    );
    expect((screen.getByLabelText('Descrição', { exact: true }) as HTMLTextAreaElement).value).toBe('');
    expect((document.getElementById('field-titulo') as HTMLInputElement).value).toBe('');
  });

  it('alterar o assunto dispara o callback do campo', () => {
    const onChange = jest.fn();
    renderForm(
      <AtendimentoFormFields
        form={initialAtendimentoForm}
        errors={{}}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText(/Descrição do assunto/), { target: { value: 'Queda' } });
    expect(onChange).toHaveBeenCalledWith('titulo', 'Queda');
  });
});
