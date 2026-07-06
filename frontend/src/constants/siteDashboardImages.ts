import type { Theme } from 'contexts/ThemeContext';

/** Preview do dashboard no site institucional (home). */
export const SITE_DASHBOARD_IMAGE: Record<Theme, string> = {
  light: '/dashboard-light.png',
  dark: '/dashboard-dark.png',
};

export function getSiteDashboardImage(theme: Theme): string {
  return SITE_DASHBOARD_IMAGE[theme];
}
