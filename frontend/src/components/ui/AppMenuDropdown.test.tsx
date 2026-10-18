import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { AppMenuDropdown } from './AppMenuDropdown';

it('abre o menu e dispara o item', () => {
  const onOpenChange = jest.fn();
  const onItem = jest.fn();

  const { rerender } = render(
    <AppMenuDropdown
      open={false}
      onOpenChange={onOpenChange}
      trigger={<button type="button">Imprimir</button>}
      items={[{ key: 'a', label: 'Contrato', onClick: onItem }]}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
  expect(onOpenChange).toHaveBeenCalledWith(true);

  rerender(
    <AppMenuDropdown
      open
      onOpenChange={onOpenChange}
      trigger={<button type="button">Imprimir</button>}
      items={[{ key: 'a', label: 'Contrato', onClick: onItem }]}
    />
  );

  fireEvent.click(screen.getByRole('menuitem', { name: 'Contrato' }));
  expect(onItem).toHaveBeenCalled();
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it('não dispara item desabilitado', () => {
  const onOpenChange = jest.fn();
  const onItem = jest.fn();

  render(
    <AppMenuDropdown
      open
      onOpenChange={onOpenChange}
      trigger={<button type="button">Enviar</button>}
      items={[{ key: 'r', label: 'Recibo', onClick: onItem, disabled: true }]}
    />
  );

  expect((screen.getByRole('menuitem', { name: 'Recibo' }) as HTMLButtonElement).disabled).toBe(
    true
  );
  fireEvent.click(screen.getByRole('menuitem', { name: 'Recibo' }));
  expect(onItem).not.toHaveBeenCalled();
});
