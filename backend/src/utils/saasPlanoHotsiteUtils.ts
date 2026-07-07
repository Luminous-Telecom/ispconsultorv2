import type { PlanoModuloId } from '../constants/planoModulos';
import { SAAS_PLANO_LIMITE_DEFS } from '../constants/saasPlanoLimites';
import type { SaasPlano } from '../models/saas/SaasPlano';
import {
  appendLegacyIxcProvedorModulo,
  readLimiteFromRecursos,
} from './saasPlanoLimiteRecursosUtils';

export const PLANO_MODULO_LABELS: Record<PlanoModuloId, string> = {
  cadastros: 'Cadastros',
  financeiro: 'Financeiro',
  blockdomi: 'Blockdomi',
  equipamentos: 'Equipamentos',
  rpki: 'RPKI',
  ixc_provedor: 'IXC Provedor',
  envio_notificacoes: 'Envio de notificações',
  assinatura_digital: 'Assinatura digital',
  nfse: 'NFS-e',
};

export interface HotsitePlanoLimite {
  chave: string;
  label: string;
  valor: string;
}

export interface HotsitePlanoModulo {
  id: PlanoModuloId;
  label: string;
}

export interface HotsitePlanoPublico {
  id: number;
  nome: string;
  descricao: string | null;
  valor_mensal: number;
  valor_mensal_original: number | null;
  valor_anual: number | null;
  valor_anual_original: number | null;
  desconto_percentual: number;
  modulos: HotsitePlanoModulo[];
  limites: HotsitePlanoLimite[];
}

function parseRecursos(recursos: unknown): Record<string, unknown> {
  if (recursos == null) return {};
  if (typeof recursos === 'string') {
    try {
      const parsed = JSON.parse(recursos) as unknown;
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof recursos === 'object' && !Array.isArray(recursos)) {
    return recursos as Record<string, unknown>;
  }
  return {};
}

function extrairModulos(recursos: Record<string, unknown>): PlanoModuloId[] {
  const raw = recursos.modulos;
  if (!Array.isArray(raw)) return [];
  const modulos = raw.filter((m): m is PlanoModuloId => typeof m === 'string' && m in PLANO_MODULO_LABELS);
  return appendLegacyIxcProvedorModulo(modulos, recursos);
}

function extrairNumero(obj: Record<string, unknown>, key: string, fallback: number): number {
  const v = obj[key];
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.floor(v));
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseInt(v, 10);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return fallback;
}

function formatLimite(valor: number): string {
  return valor <= 0 ? 'Ilimitado' : String(valor);
}

function arredondarMoeda(valor: number): number {
  return Math.round(valor * 100) / 100;
}

export function serializeSaasPlanoForHotsite(plano: SaasPlano): HotsitePlanoPublico {
  const recursos = parseRecursos(plano.recursos);
  const modulos = extrairModulos(recursos);
  const descontoPercentual = arredondarMoeda(Number(plano.desconto_percentual) || 0);
  const valorMensal = arredondarMoeda(Number(plano.valor_mensal) || 0);
  const valorAnualRaw = plano.valor_anual != null ? Number(plano.valor_anual) : null;
  const valorAnual = valorAnualRaw != null && Number.isFinite(valorAnualRaw) ? arredondarMoeda(valorAnualRaw) : null;

  const limites: HotsitePlanoLimite[] = [];

  if (modulos.includes('cadastros')) {
    limites.push({
      chave: 'usuarios',
      label: 'Usuários',
      valor: formatLimite(Number(plano.limite_usuarios) || 0),
    });
  }

  for (const def of SAAS_PLANO_LIMITE_DEFS) {
    if (!modulos.includes(def.modulo)) continue;
    limites.push({
      chave: def.formKey,
      label: def.listLabelShort,
      valor: formatLimite(readLimiteFromRecursos(recursos, def.recursosKey, 0)),
    });
  }

  return {
    id: plano.id,
    nome: plano.nome,
    descricao: plano.descricao ?? null,
    valor_mensal: valorMensal,
    valor_mensal_original: null,
    valor_anual: valorAnual,
    valor_anual_original:
      valorAnual != null && valorMensal > 0
        ? (() => {
            const referencia = arredondarMoeda(valorMensal * 12);
            return referencia > valorAnual ? referencia : null;
          })()
        : null,
    desconto_percentual: descontoPercentual,
    modulos: modulos.map((id) => ({ id, label: PLANO_MODULO_LABELS[id] })),
    limites,
  };
}
