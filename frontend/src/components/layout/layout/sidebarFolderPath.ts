import type { SidebarFolderConfig } from './types';

/** Caminho de pastas (accordionId) que contém o item — pai e aninhada, se houver. */
export function findFolderPathForItem(
  folders: SidebarFolderConfig[],
  itemId: string
): string[] {
  for (const folder of folders) {
    if (folder.items.some((item) => item.id === itemId)) {
      return [folder.accordionId];
    }
    for (const nested of folder.nestedFolders ?? []) {
      if (nested.items.some((item) => item.id === itemId)) {
        return [folder.accordionId, nested.accordionId];
      }
    }
  }
  return [];
}
