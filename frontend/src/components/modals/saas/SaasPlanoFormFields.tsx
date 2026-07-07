import React from 'react';
import { AtivoInativoField, Checkbox, FormField, LabelWithHelp } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { PLANO_MODULOS } from 'constants/planoModulos';
import type { PlanoModuloId } from 'services/planoModulosService';
import type { SaasPlanoLimitesConfig } from 'utils/saasPlanoRecursos';
import {
  SAAS_PLANO_LIMITE_DEFS,
  SAAS_PLANO_LIMITE_GRUPO_LABEL,
  type SaasPlanoLimiteGrupo,
} from 'constants/saasPlanoLimites';
import { getSaasPlanoLimiteGruposAtivos } from 'utils/saasPlanoModuloLimites';

export interface SaasPlanoFormData {
  nome: string;
  descricao: string;
  valor_mensal: number;
  valor_anual: number | '';
  limite_usuarios: number;
  ativo: boolean;
  mostrar_hotsite: boolean;
  desconto_percentual: number;
  modulos: PlanoModuloId[];
  limites: SaasPlanoLimitesConfig;
}

export interface SaasPlanoGeralFormFieldsProps {
  form: SaasPlanoFormData;
  errors: Partial<Record<keyof SaasPlanoFormData, string>>;
  onFieldChange: <K extends keyof SaasPlanoFormData>(field: K, value: SaasPlanoFormData[K]) => void;
  onClearError: (field: keyof SaasPlanoFormData) => void;
}

export const SaasPlanoGeralFormFields: React.FC<SaasPlanoGeralFormFieldsProps> = ({
  form,
  errors,
  onFieldChange,
  onClearError,
}) => {
  const { t } = useI18n();

  return (
    <>
      <div className="row g-2">
        <div className="col-12">
          <div className="mb-0">
            <FormField
              name="nome"
              type="text"
              label={t('table.planName')}
              value={form.nome}
              onChange={(v) => {
                onFieldChange('nome', String(v ?? ''));
                onClearError('nome');
              }}
              required
              size="sm"
              error={errors.nome}
            />
          </div>
        </div>
        <div className="col-12">
          <div className="mb-0">
            <AtivoInativoField
              value={form.ativo}
              onChange={(v) => onFieldChange('ativo', v)}
              name="saas-plano-ativo"
              required
            />
          </div>
        </div>
        <div className="col-12">
          <div className="mb-0">
            <FormField
              name="valor_mensal"
              type="number"
              label="Valor Mensal (R$)"
              helpText={t('saas.planMonthlyPriceHelp')}
              value={form.valor_mensal}
              onChange={(v) => {
                onFieldChange('valor_mensal', Number(v ?? 0));
                onClearError('valor_mensal');
              }}
              min={0}
              step={0.01}
              required
              size="sm"
              error={errors.valor_mensal}
            />
          </div>
        </div>
        <div className="col-12">
          <div className="mb-0">
            <FormField
              name="desconto_percentual"
              type="number"
              label={t('saas.planHotsiteDiscount')}
              helpText={t('saas.planHotsiteDiscountHelp')}
              value={form.desconto_percentual}
              onChange={(v) => onFieldChange('desconto_percentual', Number(v ?? 0))}
              min={0}
              max={100}
              step={0.01}
              size="sm"
            />
          </div>
        </div>
        <div className="col-12">
          <div className="mb-0">
            <FormField
              name="valor_anual"
              type="number"
              label="Valor Anual (R$)"
              helpText={t('saas.planAnnualPriceHelp')}
              value={form.valor_anual === '' ? '' : form.valor_anual}
              onChange={(v) =>
                onFieldChange(
                  'valor_anual',
                  v !== '' && v !== null && v !== undefined ? Number(v) : ''
                )
              }
              min={0}
              step={0.01}
              size="sm"
            />
          </div>
        </div>
        <div className="col-12">
          <div className="form-field mb-0">
            <LabelWithHelp className="form-label small" helpText={t('saas.planShowOnHotsiteHelp')}>
              {t('saas.planShowOnHotsite')}
            </LabelWithHelp>
            <div className="form-field-control">
              <Checkbox
                checked={form.mostrar_hotsite}
                onChange={({ value }) => onFieldChange('mostrar_hotsite', value)}
                label={t('saas.planShowOnHotsiteLabel')}
                inline
              />
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className="mb-0">
            <FormField
              name="descricao"
              type="textarea"
              label={t('form.description')}
              value={form.descricao}
              onChange={(v) => onFieldChange('descricao', String(v ?? ''))}
              rows={3}
              size="sm"
            />
          </div>
        </div>
        <div className="col-12">
          <div className="form-field mb-0">
            <LabelWithHelp className="form-label small" helpText={t('saas.planModulesHelp')}>
              {t('saas.planModules')}
            </LabelWithHelp>
            <div className="form-field-control">
              <div className="d-flex flex-wrap gap-3">
                {PLANO_MODULOS.map((mod) => (
                  <Checkbox
                    key={mod.id}
                    checked={form.modulos.includes(mod.id)}
                    onChange={({ value }) => {
                        onFieldChange(
                          'modulos',
                          value
                            ? [...form.modulos, mod.id]
                            : form.modulos.filter((m) => m !== mod.id)
                        );
                      }}
                    label={mod.label}
                    inline
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export interface SaasPlanoLimitesFormFieldsProps {
  form: SaasPlanoFormData;
  onFieldChange: <K extends keyof SaasPlanoFormData>(field: K, value: SaasPlanoFormData[K]) => void;
}

export const SaasPlanoLimitesFormFields: React.FC<SaasPlanoLimitesFormFieldsProps> = ({
  form,
  onFieldChange,
}) => {
  const { t } = useI18n();
  const gruposAtivos = getSaasPlanoLimiteGruposAtivos(form.modulos);

  if (gruposAtivos.length === 0) {
    return (
      <p className="text-muted small mb-0">{t('saas.planModuleLimitsEmpty')}</p>
    );
  }

  const handleLimiteChange = (formKey: string, value: number) => {
    onFieldChange('limites', { ...form.limites, [formKey]: value });
  };

  return (
    <>
      <div className="form-modal-input-col mb-2">
        <small className="form-helper-message">{t('saas.planLimitZeroHelp')}</small>
      </div>
      {gruposAtivos.map((grupo) => {
        const defs = SAAS_PLANO_LIMITE_DEFS.filter(
          (def) => def.grupo === grupo && form.modulos.includes(def.modulo)
        );
        if (defs.length === 0) return null;

        return (
          <div key={grupo} className="mb-3">
            <h6 className="small fw-semibold text-muted mb-2">
              {SAAS_PLANO_LIMITE_GRUPO_LABEL[grupo as SaasPlanoLimiteGrupo]}
            </h6>
            <div className="row g-2">
              {grupo === 'cadastros' && form.modulos.includes('cadastros') && (
                <div className="col-12">
                  <div className="mb-0">
                    <FormField
                      name="limite_usuarios"
                      type="number"
                      label={t('form.usersQuantity')}
                      value={form.limite_usuarios}
                      onChange={(v) => onFieldChange('limite_usuarios', Number(v ?? 5))}
                      min={1}
                      size="sm"
                    />
                  </div>
                </div>
              )}
              {defs.map((def) => (
                <div key={def.recursosKey} className="col-12">
                  <div className="mb-0">
                    <FormField
                      name={def.recursosKey}
                      type="number"
                      label={def.label}
                      value={form.limites[def.formKey] ?? 0}
                      onChange={(v) => handleLimiteChange(def.formKey, Number(v ?? 0))}
                      min={0}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
};
