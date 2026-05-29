import type { TranslationKeys } from 'contexts/I18nContext';

export type TranslateFn = (
  key: keyof TranslationKeys,
  params?: Record<string, string | number>
) => string;

export interface SidebarMenuItem {
  id: string;
  modalId: string;
  label: string;
  icon: string;
  onClick: () => void;
}

export interface SidebarNestedFolderConfig {
  accordionId: string;
  collapseId: string;
  headingId: string;
  titleKey: keyof TranslationKeys;
  items: SidebarMenuItem[];
}

export interface SidebarFolderConfig {
  accordionId: string;
  collapseId: string;
  headingId: string;
  title: string;
  items: SidebarMenuItem[];
  requireModulosLoaded?: boolean;
  nestedFolders?: SidebarNestedFolderConfig[];
}
