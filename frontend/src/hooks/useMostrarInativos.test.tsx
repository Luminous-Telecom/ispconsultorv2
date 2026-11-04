import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from 'contexts/I18nContext';
import { filtroSomenteAtivos, useMostrarInativos } from './useMostrarInativos';

function Painel({ onPage }: { onPage: (page: number) => void }) {
  const { showInactive, control } = useMostrarInativos(onPage);
  return (
    <div>
      {control}
      <span>{showInactive ? 'todos' : 'ativos'}</span>
    </div>
  );
}

it('mantém só o valor ativo enquanto o checkbox está desmarcado', () => {
  expect(filtroSomenteAtivos(false, true)).toBe(true);
  expect(filtroSomenteAtivos(false, 'ativo')).toBe('ativo');
  expect(filtroSomenteAtivos(true, true)).toBeUndefined();
});

it('mostra inativos e volta para a primeira página ao marcar', () => {
  localStorage.setItem('app-language', 'pt-BR');
  const onPage = jest.fn();
  render(
    <I18nProvider>
      <Painel onPage={onPage} />
    </I18nProvider>
  );

  const checkbox = screen.getByRole('checkbox', { name: 'Mostrar inativos' }) as HTMLInputElement;
  expect(checkbox.checked).toBe(false);
  expect(screen.getByText('ativos')).toBeTruthy();

  fireEvent.click(checkbox);

  expect(checkbox.checked).toBe(true);
  expect(screen.getByText('todos')).toBeTruthy();
  expect(onPage).toHaveBeenCalledWith(1);
});
