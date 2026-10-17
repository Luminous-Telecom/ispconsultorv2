import type { PlanoModuloId } from '../constants/planoModulos';

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
