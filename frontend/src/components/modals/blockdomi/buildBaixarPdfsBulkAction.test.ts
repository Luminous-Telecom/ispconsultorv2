import { buildBaixarPdfsBulkAction } from './buildBaixarPdfsBulkAction';

describe('buildBaixarPdfsBulkAction', () => {
  it('mantém o texto Baixar PDFs e desabilita enquanto a descarga está pendente', () => {
    const onDownload = jest.fn();
    const action = buildBaixarPdfsBulkAction({
      label: 'Baixar PDFs',
      variant: 'primary',
      isPending: true,
      onDownload,
    });

    expect(action.label).toBe('Baixar PDFs');
    expect(action.disabled?.([])).toBe(true);
    expect(action.requiresSelection).toBe(false);
  });

  it('dispara a descarga ao clicar quando não está pendente', () => {
    const onDownload = jest.fn();
    const action = buildBaixarPdfsBulkAction({
      label: 'Baixar PDFs',
      variant: 'primary',
      isPending: false,
      onDownload,
    });

    expect(action.disabled?.([])).toBe(false);
    action.action?.([]);
    expect(onDownload).toHaveBeenCalledTimes(1);
  });
});
