import React from 'react';
import { FormField } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import type { BlockdomiOficioFormFieldsData } from './blockdomiOficioFormTypes';

export interface BlockdomiOficioFormFieldsProps {
  value: BlockdomiOficioFormFieldsData;
  onChange: (patch: Partial<BlockdomiOficioFormFieldsData>) => void;
  /** Conteúdo extra após o campo nome do ofício (ex.: descrição no bulk edit). */
  afterNomeOficio?: React.ReactNode;
}

const BlockdomiOficioFormFields: React.FC<BlockdomiOficioFormFieldsProps> = ({
  value,
  onChange,
  afterNomeOficio,
}) => {
  const { t } = useI18n();

  return (
    <>
      <div className="col-12">
        <FormField
          name="nome_oficio"
          type="text"
          label={t('blockdomi.nomeOficio')}
          value={value.nome_oficio}
          onChange={(v) => onChange({ nome_oficio: String(v ?? '') })}
          size="sm"
          placeholder={t('blockdomi.placeholderOficio')}
        />
      </div>
      {afterNomeOficio}
      <div className="col-12 col-md-6">
        <FormField
          name="data_inicio_bloqueio"
          type="date"
          label={t('blockdomi.dataInicioBloqueio')}
          value={value.data_inicio_bloqueio}
          onChange={(v) => onChange({ data_inicio_bloqueio: String(v ?? '') })}
          size="sm"
        />
      </div>
      <div className="col-12 col-md-6">
        <FormField
          name="data_fim_bloqueio"
          type="date"
          label={t('blockdomi.dataFimBloqueio')}
          value={value.data_fim_bloqueio}
          onChange={(v) => onChange({ data_fim_bloqueio: String(v ?? '') })}
          size="sm"
        />
      </div>
      <div className="col-12">
        <FormField
          name="link_oficio_anatel"
          type="text"
          label={t('blockdomi.linkOficioAnatel')}
          value={value.link_oficio_anatel}
          onChange={(v) => onChange({ link_oficio_anatel: String(v ?? '') })}
          size="sm"
          placeholder="https://..."
        />
      </div>
      <div className="col-12 col-md-6">
        <FormField
          name="numero_sei_anatel"
          type="text"
          label={t('blockdomi.numeroSeiAnatelOptional')}
          value={value.numero_sei_anatel}
          onChange={(v) =>
            onChange({
              numero_sei_anatel: String(v ?? '')
                .replace(/\D/g, '')
                .slice(0, 20),
            })
          }
          size="sm"
          placeholder="15497675"
        />
      </div>
      <div className="col-12">
        <FormField
          name="link_oficio_justica"
          type="text"
          label={t('blockdomi.linkOficioJustica')}
          value={value.link_oficio_justica}
          onChange={(v) => onChange({ link_oficio_justica: String(v ?? '') })}
          size="sm"
          placeholder="https://..."
        />
      </div>
      <div className="col-12">
        <FormField
          name="link_planilha_dominios"
          type="text"
          label={t('blockdomi.linkPlanilhaDominios')}
          value={value.link_planilha_dominios}
          onChange={(v) => onChange({ link_planilha_dominios: String(v ?? '') })}
          size="sm"
          placeholder="https://..."
        />
      </div>
    </>
  );
};

export default BlockdomiOficioFormFields;
