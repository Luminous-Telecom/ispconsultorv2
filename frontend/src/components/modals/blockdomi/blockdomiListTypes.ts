import type { TranslationKeys } from 'contexts/I18nContext';

export type BlockdomiTranslateFn = (
  key: keyof TranslationKeys,
  params?: Record<string, unknown>
) => string;

/** Campos comuns de listagem Blockdomi (domínio, IPv4, IPv6). */
export interface BlockdomiOficioListRow {
  id: number;
  versao?: string | null;
  descricao?: string | null;
  nome_oficio?: string | null;
  data_inicio_bloqueio?: string | null;
  data_fim_bloqueio?: string | null;
  link_oficio_anatel?: string | null;
  link_oficio_justica?: string | null;
  link_planilha_dominios?: string | null;
  numero_sei_anatel?: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
  created_at_formatada?: string | null;
}
