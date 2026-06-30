import type { SidebarFolderConfig, SidebarMenuItem, SidebarNestedFolderConfig, TranslateFn } from '../layout/types';

export function normalizeMenuSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export interface SidebarMenuSearchResult {
  item: SidebarMenuItem;
  folderPath: string;
}

export function collectSidebarMenuItems(
  folders: SidebarFolderConfig[],
  t: TranslateFn
): SidebarMenuSearchResult[] {
  const results: SidebarMenuSearchResult[] = [];

  for (const folder of folders) {
    for (const item of folder.items) {
      results.push({ item, folderPath: folder.title });
    }

    for (const nested of folder.nestedFolders ?? []) {
      const nestedTitle = t(nested.titleKey);
      for (const item of nested.items) {
        results.push({ item, folderPath: `${folder.title} › ${nestedTitle}` });
      }
    }
  }

  return results;
}

export interface SidebarMenuSearchNestedGroup {
  folder: SidebarNestedFolderConfig;
  items: SidebarMenuItem[];
}

export interface SidebarMenuSearchGroup {
  folder: SidebarFolderConfig;
  directItems: SidebarMenuItem[];
  nestedGroups: SidebarMenuSearchNestedGroup[];
}

function itemMatchesQuery(item: SidebarMenuItem, folderPath: string, normalizedQuery: string): boolean {
  const haystack = normalizeMenuSearch(`${item.label} ${folderPath}`);
  return haystack.includes(normalizedQuery);
}

export function buildSearchMenuGroups(
  folders: SidebarFolderConfig[],
  query: string,
  t: TranslateFn
): SidebarMenuSearchGroup[] {
  const normalizedQuery = normalizeMenuSearch(query);
  if (!normalizedQuery) {
    return [];
  }

  return folders
    .map((folder) => {
      const directItems = folder.items.filter((item) =>
        itemMatchesQuery(item, folder.title, normalizedQuery)
      );

      const nestedGroups = (folder.nestedFolders ?? [])
        .map((nested) => {
          const nestedTitle = t(nested.titleKey);
          const folderPath = `${folder.title} › ${nestedTitle}`;
          const items = nested.items.filter((item) =>
            itemMatchesQuery(item, folderPath, normalizedQuery)
          );
          return { folder: nested, items };
        })
        .filter((group) => group.items.length > 0);

      return { folder, directItems, nestedGroups };
    })
    .filter((group) => group.directItems.length > 0 || group.nestedGroups.length > 0);
}
