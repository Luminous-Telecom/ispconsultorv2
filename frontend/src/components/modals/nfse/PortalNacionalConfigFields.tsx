import React from 'react';
import { useI18n } from 'contexts/I18nContext';
import { FormField } from 'components/ui';

export interface PortalNacionalFormSlice {
  portal_nacional_ambiente: 'HOMOLOGACAO' | 'PRODUCAO';
  certificado_senha: string;
  certificado_nome_arquivo: string;
  has_certificado: boolean;
  certificado_titular: string;
  certificado_cnpj: string;
  certificado_validade: string;
  op_simples_nacional: string;
  regime_especial_tributacao: string;
  regime_apuracao_sn: string;
  tp_ret_issqn: string;
}

interface PortalNacionalConfigFieldsProps {
  formData: PortalNacionalFormSlice;
  disabled: boolean;
  onChange: (field: keyof PortalNacionalFormSlice | 'certificado_pfx_base64', value: string) => void;
}

function formatarValidade(valor: string, locale: string): string {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString(locale);
}

const PortalNacionalConfigFields: React.FC<PortalNacionalConfigFieldsProps> = ({
  formData,
  disabled,
  onChange,
}) => {
  const { t, language } = useI18n();
  const titular = [formData.certificado_titular, formData.certificado_cnpj].filter(Boolean).join(' — ');
  const validade = formatarValidade(formData.certificado_validade, language);

  return (
    <>
      <div className="col-12">
        <FormField
          name="nfse_certificado"
          type="file"
          label={t('nfse.certificate')}
          accept=".pfx,.p12,application/x-pkcs12"
          disabled={disabled}
          size="sm"
          helpText={
            formData.certificado_nome_arquivo
              ? formData.certificado_nome_arquivo
              : formData.has_certificado
                ? t('nfse.certificateInstalled')
                : t('nfse.certificateHelp')
          }
          onChange={(arquivo) => {
            const file = arquivo as File;
            const reader = new FileReader();
            reader.onload = () => {
              const resultado = String(reader.result || '');
              const base64 = resultado.includes(',') ? resultado.split(',')[1] : resultado;
              onChange('certificado_pfx_base64', base64);
              onChange('certificado_nome_arquivo', file.name);
            };
            reader.readAsDataURL(file);
          }}
        />
      </div>

      <div className="col-12">
        <FormField
          name="nfse_certificado_senha"
          type="password"
          label={t('nfse.certificatePassword')}
          value={formData.certificado_senha}
          onChange={(v) => onChange('certificado_senha', String(v ?? ''))}
          disabled={disabled}
          autoComplete="off"
          size="sm"
          placeholder={formData.has_certificado ? t('nfse.certificatePasswordKeep') : t('nfse.certificatePassword')}
        />
      </div>

      {formData.has_certificado && titular && (
        <div className="col-12">
          <FormField
            name="nfse_certificado_titular"
            type="text"
            label={t('nfse.certificateHolder')}
            value={validade ? `${titular} (${validade})` : titular}
            readOnly
            disabled
            size="sm"
          />
        </div>
      )}

      <div className="col-12">
        <FormField
          name="nfse_portal_ambiente"
          type="select"
          label={t('nfse.environment')}
          value={formData.portal_nacional_ambiente}
          onChange={(v) => onChange('portal_nacional_ambiente', String(v ?? '') as 'HOMOLOGACAO' | 'PRODUCAO')}
          disabled={disabled}
          options={[
            { value: 'HOMOLOGACAO', label: t('nfse.homologation') },
            { value: 'PRODUCAO', label: t('nfse.production') },
          ]}
          helpText={t('nfse.environmentHelp')}
          size="sm"
        />
      </div>

      <div className="col-12">
        <FormField
          name="nfse_op_simples"
          type="select"
          label={t('nfse.simplesNacional')}
          value={formData.op_simples_nacional}
          onChange={(v) => onChange('op_simples_nacional', String(v ?? '1'))}
          disabled={disabled}
          helpText={t('nfse.simplesNacionalHelp')}
          size="sm"
          options={[
            { value: '1', label: t('nfse.simplesNao') },
            { value: '2', label: t('nfse.simplesMei') },
            { value: '3', label: t('nfse.simplesMeEpp') },
          ]}
        />
      </div>

      {formData.op_simples_nacional === '3' && (
        <div className="col-12">
          <FormField
            name="nfse_regime_apuracao"
            type="select"
            label={t('nfse.regimeApuracao')}
            value={formData.regime_apuracao_sn}
            onChange={(v) => onChange('regime_apuracao_sn', String(v ?? ''))}
            disabled={disabled}
            size="sm"
            options={[
              { value: '1', label: t('nfse.regimeApuracao1') },
              { value: '2', label: t('nfse.regimeApuracao2') },
              { value: '3', label: t('nfse.regimeApuracao3') },
            ]}
          />
        </div>
      )}

      <div className="col-12">
        <FormField
          name="nfse_regime_especial"
          type="select"
          label={t('nfse.regimeEspecial')}
          value={formData.regime_especial_tributacao}
          onChange={(v) => onChange('regime_especial_tributacao', String(v ?? '0'))}
          disabled={disabled}
          size="sm"
          options={[
            { value: '0', label: t('nfse.regimeEspecialNenhum') },
            { value: '1', label: t('nfse.regimeEspecial1') },
            { value: '2', label: t('nfse.regimeEspecial2') },
            { value: '3', label: t('nfse.regimeEspecial3') },
            { value: '4', label: t('nfse.regimeEspecial4') },
            { value: '5', label: t('nfse.regimeEspecial5') },
            { value: '6', label: t('nfse.regimeEspecial6') },
          ]}
        />
      </div>

      <div className="col-12">
        <FormField
          name="nfse_retencao_iss"
          type="select"
          label={t('nfse.issRetention')}
          value={formData.tp_ret_issqn}
          onChange={(v) => onChange('tp_ret_issqn', String(v ?? '1'))}
          disabled={disabled}
          size="sm"
          options={[
            { value: '1', label: t('nfse.issRetentionNone') },
            { value: '2', label: t('nfse.issRetentionTomador') },
            { value: '3', label: t('nfse.issRetentionIntermediary') },
          ]}
        />
      </div>
    </>
  );
};

export default PortalNacionalConfigFields;
