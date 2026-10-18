import {
  ID_COLUMN_WIDTH_PX,
  STATUS_COLUMN_WIDTH_PX,
  getColumnMinWidth,
  getDefaultColumnWidthPx,
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

describe('getDefaultColumnWidthPx', () => {
  it('retorna largura padrão de ID', () => {
    expect(getDefaultColumnWidthPx('id')).toBe(ID_COLUMN_WIDTH_PX);
  });

  it('retorna largura padrão de Status', () => {
    expect(getDefaultColumnWidthPx('status')).toBe(STATUS_COLUMN_WIDTH_PX);
    expect(getDefaultColumnWidthPx('ativo')).toBe(STATUS_COLUMN_WIDTH_PX);
  });

  it('não fixa coluna comum', () => {
    expect(getDefaultColumnWidthPx('nome')).toBeUndefined();
  });
});

describe('getColumnMinWidth', () => {
  it('usa mínimo redimensionável para status e id', () => {
    expect(getColumnMinWidth({ key: 'status', label: 'Status' })).toBe(60);
    expect(getColumnMinWidth({ key: 'id', label: 'ID' })).toBe(40);
  });
});

describe('resolveColumnWidthPx', () => {
  it('respeita largura salva de status e id', () => {
    expect(resolveColumnWidthPx({ key: 'status' }, { status: 140 }, true)).toBe(140);
    expect(resolveColumnWidthPx({ key: 'id' }, { id: 90 }, true)).toBe(90);
  });

  it('usa padrão quando não há largura salva', () => {
    expect(resolveColumnWidthPx({ key: 'status' }, {}, false)).toBe(STATUS_COLUMN_WIDTH_PX);
    expect(resolveColumnWidthPx({ key: 'id' }, {}, false)).toBe(ID_COLUMN_WIDTH_PX);
  });
});
