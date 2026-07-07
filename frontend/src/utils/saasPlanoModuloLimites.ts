import { SAAS_PLANO_LIMITE_DEFS, SAAS_PLANO_LIMITE_GRUPO_LABEL, type SaasPlanoLimiteGrupo } from 'constants/saasPlanoLimites';
import type { PlanoModuloId } from 'services/planoModulosService';

export function getSaasPlanoModuloLabel(moduloId: PlanoModuloId): string {
  const fromPlanoModulos = SAAS_PLANO_LIMITE_GRUPO_LABEL[moduloId as SaasPlanoLimiteGrupo];
  if (fromPlanoModulos) return fromPlanoModulos;
  return moduloId;
}

export function formatSaasPlanoModulosList(modulos: PlanoModuloId[]): string {
  if (modulos.length === 0) return '';
  return modulos
    .map((moduloId) => {
      if (moduloId === 'cadastros') return 'Cadastros';
      if (moduloId === 'financeiro') return 'Financeiro';
      if (moduloId === 'blockdomi') return 'Blockdomi';
      if (moduloId === 'equipamentos') return 'Equipamentos';
      if (moduloId === 'rpki') return 'RPKI';
      if (moduloId === 'envio_notificacoes') return 'Notificações';
      if (moduloId === 'assinatura_digital') return 'Assinatura digital';
      if (moduloId === 'nfse') return 'NFS-e';
      return moduloId;
    })
    .join(', ');
}

export function saasPlanoModulosTemLimites(modulos: PlanoModuloId[]): boolean {
  return SAAS_PLANO_LIMITE_DEFS.some((def) => modulos.includes(def.modulo));
}

export const SAAS_PLANO_MODULO_COL_LABEL: Record<PlanoModuloId, string> = {
  cadastros: 'Cadastros',
  financeiro: 'Financeiro',
  blockdomi: 'Blockdomi',
  equipamentos: 'Equip.',
  rpki: 'RPKI',
  envio_notificacoes: 'Notif.',
  assinatura_digital: 'Assin.',
  nfse: 'NFS-e',
};

export function getSaasPlanoLimiteGruposAtivos(modulos: PlanoModuloId[]): SaasPlanoLimiteGrupo[] {
  const grupos = new Set<SaasPlanoLimiteGrupo>();
  for (const def of SAAS_PLANO_LIMITE_DEFS) {
    if (modulos.includes(def.modulo)) grupos.add(def.grupo);
  }
  return Array.from(grupos);
}
