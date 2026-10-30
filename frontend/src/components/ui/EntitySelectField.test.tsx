import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { NotificationProvider } from 'components/notifications/NotificationProvider';
import EntitySelectField from './EntitySelectField';

function renderField(ui: React.ReactElement) {
  localStorage.setItem('app-language', 'pt-BR');
  return render(
    <I18nProvider>
      <NotificationProvider>{ui}</NotificationProvider>
    </I18nProvider>,
  );
}

describe('EntitySelectField', () => {
  it('não deixa o navegador preencher o id com o cadastro anterior', () => {
    renderField(
      <EntitySelectField label="Cliente" value={0} onChange={jest.fn()} entities={[]} />,
    );

    const input = screen.getByTitle('Digite o ID') as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.readOnly).toBe(true);
    expect(input.hasAttribute('data-autofill-guard')).toBe(true);

    fireEvent.focus(input);
    expect(input.readOnly).toBe(false);
    expect(input.hasAttribute('data-autofill-guard')).toBe(false);
  });

  it('mostra o nome quando o id selecionado chega como texto', () => {
    renderField(
      <EntitySelectField
        label="Servidor"
        value={'1' as unknown as number}
        onChange={jest.fn()}
        entities={[{ id: 1, nome: 'SMTP principal' }]}
      />,
    );

    expect(screen.getByDisplayValue('1')).toBeTruthy();
    expect(screen.getByDisplayValue('SMTP principal')).toBeTruthy();
  });

  it('abre a edição do registro preenchido e fica desabilitado sem id', () => {
    const onEdit = jest.fn();
    const { rerender } = renderField(
      <EntitySelectField
        label="Plano"
        value={7712}
        onChange={jest.fn()}
        onEdit={onEdit}
        entities={[{ id: 7712, nome: 'AGILITY - FIBRA - 410M' }]}
      />,
    );

    const editButton = screen.getByRole('button', { name: 'Editar registro' }) as HTMLButtonElement;
    expect(editButton.disabled).toBe(false);
    fireEvent.click(editButton);
    expect(onEdit).toHaveBeenCalledTimes(1);

    rerender(
      <I18nProvider>
        <NotificationProvider>
          <EntitySelectField label="Plano" value={0} onChange={jest.fn()} onEdit={onEdit} entities={[]} />
        </NotificationProvider>
      </I18nProvider>,
    );
    expect((screen.getByRole('button', { name: 'Editar registro' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('trava a troca do registro e mantém a edição do cadastro', () => {
    const onChange = jest.fn();
    const onEdit = jest.fn();
    const onShowModal = jest.fn();
    renderField(
      <EntitySelectField
        label="Cliente"
        value={9}
        onChange={onChange}
        onEdit={onEdit}
        onShowModal={onShowModal}
        selectionLocked
        entities={[{ id: 9, nome: 'Fenix' }]}
      />,
    );

    const idInput = screen.getByTitle('Digite o ID') as HTMLInputElement;
    expect(idInput.closest('.input-group')?.classList.contains('entity-select-locked')).toBe(true);
    expect(idInput.readOnly).toBe(true);
    fireEvent.focus(idInput);
    expect(idInput.readOnly).toBe(true);
    fireEvent.change(idInput, { target: { value: '10' } });
    expect(onChange).not.toHaveBeenCalled();

    const search = screen.getByRole('button', { name: 'Abrir listagem de registros' }) as HTMLButtonElement;
    expect(search.disabled).toBe(true);

    const edit = screen.getByRole('button', { name: 'Editar registro' }) as HTMLButtonElement;
    expect(edit.disabled).toBe(false);
    fireEvent.click(edit);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('não mostra o botão de edição quando o campo não abre cadastro', () => {
    renderField(
      <EntitySelectField label="Cliente" value={4} onChange={jest.fn()} entities={[{ id: 4, nome: 'Cliente' }]} />,
    );
    expect(screen.queryByRole('button', { name: 'Editar registro' })).toBeNull();
    expect(screen.getByTitle('Digite o ID').closest('.input-group')?.classList.contains('entity-select-locked')).toBe(false);
  });
});
