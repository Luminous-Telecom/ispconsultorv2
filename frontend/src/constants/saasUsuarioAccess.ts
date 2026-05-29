import type { SaasNivelAcesso } from 'services/saas/saasUsuariosService';

export const SAAS_USUARIO_NIVEL_OPTIONS: Array<{ value: SaasNivelAcesso; label: string }> = [
  { value: 'super', label: 'Super' },
  { value: 'admin', label: 'Admin' },
  { value: 'suporte', label: 'Suporte' },
];

export const SAAS_USUARIO_NIVEL_LABEL: Record<SaasNivelAcesso, string> = {
  super: 'Super',
  admin: 'Admin',
  suporte: 'Suporte',
};

export const SAAS_USUARIO_NIVEL_BADGE_COLOR: Record<SaasNivelAcesso, string> = {
  super: 'danger',
  admin: 'primary',
  suporte: 'secondary',
};

export function formatSaasUsuarioNivel(nivel: string): string {
  return SAAS_USUARIO_NIVEL_LABEL[nivel as SaasNivelAcesso] ?? nivel;
}

export function getSaasUsuarioNivelBadgeColor(nivel: string): string {
  return SAAS_USUARIO_NIVEL_BADGE_COLOR[nivel as SaasNivelAcesso] ?? 'secondary';
}
