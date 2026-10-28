import React from 'react';
import { render, screen } from '@testing-library/react';
import EntityRecordEditModal from './EntityRecordEditModal';

jest.mock('components/modals/planos/PlanoModal', () => ({
  __esModule: true,
  default: ({ planoId }: { planoId: number }) => <div>plano-{planoId}</div>,
}));

describe('EntityRecordEditModal', () => {
  it('abre o cadastro do plano preenchido', async () => {
    render(<EntityRecordEditModal kind="plano" recordId={7712} onClose={jest.fn()} />);
    expect(await screen.findByText('plano-7712')).toBeTruthy();
  });
});
