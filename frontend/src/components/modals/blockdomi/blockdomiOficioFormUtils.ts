import type {
  BlockdomiOficioFormEntitySource,
  BlockdomiOficioFormFieldsData,
} from './blockdomiOficioFormTypes';

export function getBlockdomiOficioFormDefaults(
  includeStartDate = true
): BlockdomiOficioFormFieldsData {
  let dataInicio = '';
  if (includeStartDate) {
    const today = new Date();
    dataInicio = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
  return {
    nome_oficio: '',
    data_inicio_bloqueio: dataInicio,
    data_fim_bloqueio: '',
    link_oficio_anatel: '',
    link_oficio_justica: '',
    link_planilha_dominios: '',
    numero_sei_anatel: '',
  };
}

export function mapToBlockdomiOficioFormFields(
  entity: BlockdomiOficioFormEntitySource
): BlockdomiOficioFormFieldsData {
  return {
    nome_oficio: entity.nome_oficio || '',
    data_inicio_bloqueio: entity.data_inicio_bloqueio
      ? String(entity.data_inicio_bloqueio).slice(0, 10)
      : '',
    data_fim_bloqueio: entity.data_fim_bloqueio
      ? String(entity.data_fim_bloqueio).slice(0, 10)
      : '',
    link_oficio_anatel: entity.link_oficio_anatel || '',
    link_oficio_justica: entity.link_oficio_justica || '',
    link_planilha_dominios: entity.link_planilha_dominios || '',
    numero_sei_anatel: entity.numero_sei_anatel || '',
  };
}

export function pickBlockdomiOficioFormFields(
  data: BlockdomiOficioFormFieldsData
): BlockdomiOficioFormFieldsData {
  return {
    nome_oficio: data.nome_oficio,
    data_inicio_bloqueio: data.data_inicio_bloqueio,
    data_fim_bloqueio: data.data_fim_bloqueio,
    link_oficio_anatel: data.link_oficio_anatel,
    link_oficio_justica: data.link_oficio_justica,
    link_planilha_dominios: data.link_planilha_dominios,
    numero_sei_anatel: data.numero_sei_anatel,
  };
}

export function normalizeBlockdomiOficioFormFields(
  fields: BlockdomiOficioFormFieldsData
): {
  nome_oficio: string | null;
  data_inicio_bloqueio: string | null;
  data_fim_bloqueio: string | null;
  link_oficio_anatel: string | null;
  link_oficio_justica: string | null;
  link_planilha_dominios: string | null;
  numero_sei_anatel: string | null;
} {
  return {
    nome_oficio: fields.nome_oficio.trim() || null,
    data_inicio_bloqueio: fields.data_inicio_bloqueio.trim() || null,
    data_fim_bloqueio: fields.data_fim_bloqueio.trim() || null,
    link_oficio_anatel: fields.link_oficio_anatel.trim() || null,
    link_oficio_justica: fields.link_oficio_justica.trim() || null,
    link_planilha_dominios: fields.link_planilha_dominios.trim() || null,
    numero_sei_anatel: fields.numero_sei_anatel.trim() || null,
  };
}
