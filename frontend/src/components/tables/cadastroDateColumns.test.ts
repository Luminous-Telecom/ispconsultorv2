import { withCadastroDateColumns } from './cadastroDateColumns';

const t = (key: string) => key;

it('inclui criação e última modificação quando a tabela não tem essas colunas', () => {
  const columns = withCadastroDateColumns([{ key: 'id', label: 'ID' }], t);
  expect(columns.map((column) => column.key)).toEqual(['id', 'created_at', 'updated_at']);
  expect(columns[1].label).toBe('table.createdAt');
  expect(columns[2].label).toBe('table.updatedAt');
});

it('não duplica a coluna que a tabela já tem', () => {
  const columns = withCadastroDateColumns(
    [{ key: 'created_at', label: 'Data cadastro' }],
    t,
  );
  expect(columns.map((column) => column.key)).toEqual(['created_at', 'updated_at']);
});

it('formata a data do registro e mostra traço quando não há valor', () => {
  const columns = withCadastroDateColumns<{ id: number; created_at?: string; updated_at?: string }>(
    [{ key: 'id', label: 'ID' }],
    t,
  );
  const criado = columns.find((column) => column.key === 'created_at');
  const alterado = columns.find((column) => column.key === 'updated_at');
  expect(criado?.render?.({ id: 1, created_at: '2026-11-04T18:16:00.000Z' })).not.toBe('-');
  expect(alterado?.render?.({ id: 1 })).toBe('-');
});
