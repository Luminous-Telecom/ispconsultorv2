import { safeFormatDateISOLocal } from '../../../utils/timezoneUtils';

const CAMPOS_EXCLUIR = new Set([
  'dataValues',
  '_changed',
  '_options',
  'isNewRecord',
  '_previousDataValues',
  '$modelOptions',
  'Model',
  ['seque', 'lize'].join(''),
  'tableName',
  'xml',
  'pdf_base64',
  'pdf_url',
  'danfe_url',
  'pagamentos',
  'arquivos',
  'saldo_devedor',
  'vencida',
]);

/** Includes de relacionamento — viram `*_ids` / `*_id`, não entram inteiros no diff. */
const RELACIONAMENTOS_ARRAY = [
  'planos',
  'titulos',
  'contratos',
  'termos',
  'mensagens',
  'notas_fiscais',
  'parcelas',
  'documentos',
  'anexos',
  'clientes',
  'bancos',
  'usuarios',
];

function itemRelacionamentoAtivo(key: string, item: Record<string, unknown>): boolean {
  let isAtivo = true;
  if (key === 'contratos' && item.status != null) {
    isAtivo = String(item.status).toLowerCase() === 'ativo';
  } else if (key === 'titulos' && item.status != null) {
    isAtivo = String(item.status).toLowerCase() !== 'cancelado';
  } else if (item.ativo !== undefined) {
    isAtivo = item.ativo === true || item.ativo === 1;
  } else if (item.status !== undefined) {
    const statusLower = String(item.status).toLowerCase();
    isAtivo = !['cancelado', 'inativo', 'excluido', 'deleted', 'suspenso'].includes(statusLower);
  }
  return isAtivo;
}

/**
 * Remove metadados de instância e achata relacionamentos (planos → planos_ids, etc.).
 * Usado no Elasticsearch e no diff do log operacional (MySQL).
 */
export function normalizarSnapshotAuditoria(
  dados: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return null;

  const limpo: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(dados)) {
    if (key.startsWith('_') || key.startsWith('$') || CAMPOS_EXCLUIR.has(key)) {
      continue;
    }
    if (value === null || value === undefined) {
      continue;
    }

    if (RELACIONAMENTOS_ARRAY.includes(key)) {
      if (Array.isArray(value)) {
        const ids = value
          .slice(0, 10)
          .map((item) => {
            if (item && typeof item === 'object' && !Array.isArray(item)) {
              const o = item as Record<string, unknown>;
              if (o.id === undefined) return null;
              return itemRelacionamentoAtivo(key, o) ? o.id : null;
            }
            return null;
          })
          .filter((id) => id !== null);
        if (ids.length > 0) {
          limpo[`${key}_ids`] = ids;
        }
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        const item = value as Record<string, unknown>;
        if (item.id !== undefined && itemRelacionamentoAtivo(key, item)) {
          limpo[`${key}_id`] = item.id;
        }
      }
      continue;
    }

    if (key === 'created_at_formatada' || key.endsWith('_formatada')) {
      if (typeof value === 'string') {
        limpo[key] = value;
      }
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const relObj = value as Record<string, unknown>;
      if (relObj.id !== undefined) {
        limpo[`${key}_id`] = relObj.id;
      }
      continue;
    }

    if (value instanceof Date || typeof value !== 'object') {
      limpo[key] = value instanceof Date ? safeFormatDateISOLocal(value) : value;
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      const arrLimpo = value
        .slice(0, 5)
        .map((item) => {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            const o = item as Record<string, unknown>;
            return o.id !== undefined ? o.id : null;
          }
          return typeof item === 'object' ? null : item;
        })
        .filter((item) => item !== null);
      if (arrLimpo.length > 0) {
        limpo[key] = arrLimpo;
      }
    }
  }

  return Object.keys(limpo).length > 0 ? limpo : null;
}
