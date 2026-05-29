/** Campos de ofício compartilhados entre forms Blockdomi (domínio, IPv4, IPv6, bulk). */
export interface BlockdomiOficioFormFieldsData {
  nome_oficio: string;
  data_inicio_bloqueio: string;
  data_fim_bloqueio: string;
  link_oficio_anatel: string;
  link_oficio_justica: string;
  link_planilha_dominios: string;
  numero_sei_anatel: string;
}

export type BlockdomiOficioFormEntitySource = Partial<{
  [K in keyof BlockdomiOficioFormFieldsData]: string | null;
}>;
