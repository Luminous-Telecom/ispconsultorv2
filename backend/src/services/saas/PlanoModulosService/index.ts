import type { PlanoModuloId } from '../../../constants/planoModulos';

/**
 * Instalação única: null significa todos os módulos liberados.
 */
export async function getModulosDoPlano(_empresaId: number): Promise<PlanoModuloId[] | null> {
  return null;
}

export function tenantTemModulo(modulos: PlanoModuloId[] | null, moduloId: PlanoModuloId): boolean {
  if (modulos === null) return true;
  return modulos.includes(moduloId);
}

export interface EquipamentosLimites {
  temModulo: boolean;
  limite_equipamentos: number;
  limite_tuneis: number;
  limite_backups: number;
}

export async function getEquipamentosLimites(_empresaId: number): Promise<EquipamentosLimites | null> {
  return null;
}
