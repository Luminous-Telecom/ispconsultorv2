import {
  ID_COLUMN_WIDTH_PX,
  STATUS_COLUMN_WIDTH_PX,
  getColumnMinWidth,
  getFixedColumnWidthPx,
  isStatusColumnKey,
  resolveColumnWidthPx,
} from './columnWidthUtils';

describe('isStatusColumnKey', () => {
  it('reconhece status e ativo', () => {
    expect(isStatusColumnKey('status')).toBe(true);
    expect(isStatusColumnKey('ativo')).toBe(true);
  });

  it('recusa chave que não é status', () => {
    expect(isStatusColumnKey('id')).toBe(false);
    expect(isStatusColumnKey('nome')).toBe(false);
  });
});

describe('getFixedColumnWidthPx', () => {
  it('retorna largura padrão de ID', () => {
    expect(getFixedColumnWidthPx('id')).toBe(ID_COLUMN_WIDTH_PX);
  });

  it('retorna largura padrão de Status', () => {
    expect(getFixedColumnWidthPx('status')).toBe(STATUS_COLUMN_WIDTH_PX);
    expect(getFixedColumnWidthPx('ativo')).toBe(STATUS_COLUMN_WIDTH_PX);
  });

  it('não fixa coluna comum', () => {
    expect(getFixedColumnWidthPx('nome')).toBeUndefined();
  });
});

describe('getColumnMinWidth', () => {
  it('usa largura padrão para status e id', () => {
    expect(getColumnMinWidth({ key: 'status', label: 'Status' })).toBe(STATUS_COLUMN_WIDTH_PX);
    expect(getColumnMinWidth({ key: 'id', label: 'ID' })).toBe(ID_COLUMN_WIDTH_PX);
  });
});

describe('resolveColumnWidthPx', () => {
  it('ignora localStorage e width local para status e id', () => {
    expect(resolveColumnWidthPx({ key: 'status', width: 200 }, { status: 300 }, true)).toBe(
      STATUS_COLUMN_WIDTH_PX
    );
    expect(resolveColumnWidthPx({ key: 'id', width: '90px' }, { id: 120 }, true)).toBe(
      ID_COLUMN_WIDTH_PX
    );
  });
});
