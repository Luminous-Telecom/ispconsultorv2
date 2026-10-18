import { findFolderPathForItem } from './sidebarFolderPath';
import type { SidebarFolderConfig } from './types';

const folders: SidebarFolderConfig[] = [
  {
    accordionId: 'cadastros',
    collapseId: 'cadastrosCollapse',
    headingId: 'cadastrosHeading',
    title: 'Cadastros',
    items: [{ id: 'clientes', modalId: 'clientes', label: 'Clientes', icon: '', onClick: jest.fn() }],
    nestedFolders: [
      {
        accordionId: 'logsErp',
        collapseId: 'logsErpCollapse',
        headingId: 'logsErpHeading',
        titleKey: 'menu.logsErp' as never,
        items: [
          {
            id: 'logs-usuarios',
            modalId: 'logs-usuarios',
            label: 'Logs de Usuários',
            icon: '',
            onClick: jest.fn(),
          },
        ],
      },
    ],
  },
];

describe('findFolderPathForItem', () => {
  it('retorna a pasta pai do item direto', () => {
    expect(findFolderPathForItem(folders, 'clientes')).toEqual(['cadastros']);
  });

  it('retorna pai e pasta aninhada do item', () => {
    expect(findFolderPathForItem(folders, 'logs-usuarios')).toEqual(['cadastros', 'logsErp']);
  });

  it('retorna lista vazia quando o item não existe', () => {
    expect(findFolderPathForItem(folders, 'inexistente')).toEqual([]);
  });
});
