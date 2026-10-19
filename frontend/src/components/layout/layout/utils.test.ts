import { isMenuFolderVisible } from './utils';
import type { SidebarFolderConfig } from './types';

function folder(partial: Partial<SidebarFolderConfig>): SidebarFolderConfig {
  return {
    accordionId: 'integracoesAccordion',
    collapseId: 'integracoesCollapse',
    headingId: 'integracoesHeading',
    title: 'Integrações',
    items: [],
    ...partial,
  };
}

describe('isMenuFolderVisible', () => {
  it('esconde integração, suporte e logs quando não há itens', () => {
    expect(isMenuFolderVisible(folder({ items: [] }), false)).toBe(false);
    expect(
      isMenuFolderVisible(
        folder({
          accordionId: 'logsAccordion',
          nestedFolders: [
            {
              accordionId: 'logsComunicacaoAccordion',
              collapseId: 'logsComunicacaoCollapse',
              headingId: 'logsComunicacaoHeading',
              titleKey: 'layout.folderLogsComunicacao',
              items: [],
            },
          ],
        }),
        false
      )
    ).toBe(false);
  });

  it('mostra a pasta quando ainda existe item', () => {
    expect(
      isMenuFolderVisible(
        folder({
          items: [
            {
              id: 'nfse',
              modalId: 'nfse',
              label: 'NFS-e',
              icon: 'bi-receipt',
              onClick: () => undefined,
            },
          ],
        }),
        false
      )
    ).toBe(true);
  });
});
