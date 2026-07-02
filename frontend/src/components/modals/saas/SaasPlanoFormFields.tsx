import React from 'react';
import { FormField, AtivoInativoField, LabelWithHelp } from 'components/ui';
import { useI18n } from 'contexts/I18nContext';
import { PLANO_MODULOS } from 'constants/planoModulos';
import type { PlanoModuloId } from 'services/planoModulosService';
import type { SaasPlanoEquipamentosConfig } from 'utils/saasPlanoRecursos';

export interface SaasPlanoFormData {
  nome: string;
  descricao: string;
  valor_mensal: number;
  valor_anual: number | '';
  limite_usuarios: number;
  ativo: boolean;
  modulos: PlanoModuloId[];
  equipamentos: SaasPlanoEquipamentosConfig;
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
              name="valor_anual"
              type="number"
              label="Valor Anual (R$)"
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
          <div className="mb-0">
            <FormField
              name="limite_usuarios"
              type="number"
              label="Limite de Usuários"
              value={form.limite_usuarios}
              onChange={(v) => onFieldChange('limite_usuarios', Number(v ?? 5))}
              min={1}
              size="sm"
            />
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
                  <label key={mod.id} className="d-flex align-items-center gap-2 small">
                    <input
                      type="checkbox"
                      checked={form.modulos.includes(mod.id)}
                      onChange={(e) => {
                        onFieldChange(
                          'modulos',
                          e.target.checked
                            ? [...form.modulos, mod.id]
                            : form.modulos.filter((m) => m !== mod.id)
                        );
                      }}
                    />
                    <span>{mod.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export interface SaasPlanoEquipamentosFormFieldsProps {
  equipamentos: SaasPlanoEquipamentosConfig;
  onEquipamentosChange: (equipamentos: SaasPlanoEquipamentosConfig) => void;
}

export const SaasPlanoEquipamentosFormFields: React.FC<SaasPlanoEquipamentosFormFieldsProps> = ({
  equipamentos,
  onEquipamentosChange,
}) => {
  const { t } = useI18n();

  return (
  <>
    <div className="mb-2">
      <LabelWithHelp as="span" helpText={t('saas.planLimitZeroHelp')} helpIconClassName="ms-0" />
    </div>
    <div className="row g-2">
      <div className="col-12">
        <div className="mb-0">
          <FormField
            name="equipamentos_limite_equipamentos"
            type="number"
            label="Limite de equipamentos"
            value={equipamentos.limite_equipamentos}
            onChange={(v) =>
              onEquipamentosChange({
                ...equipamentos,
                limite_equipamentos: Number(v ?? 0),
              })
            }
            min={0}
            size="sm"
          />
        </div>
      </div>
      <div className="col-12">
        <div className="mb-0">
          <FormField
            name="equipamentos_limite_tuneis"
            type="number"
            label="Limite de túneis"
            value={equipamentos.limite_tuneis}
            onChange={(v) =>
              onEquipamentosChange({
                ...equipamentos,
                limite_tuneis: Number(v ?? 0),
              })
            }
            min={0}
            size="sm"
          />
        </div>
      </div>
      <div className="col-12">
        <div className="mb-0">
          <FormField
            name="equipamentos_limite_backups"
            type="number"
            label="Limite de backups"
            value={equipamentos.limite_backups}
            onChange={(v) =>
              onEquipamentosChange({
                ...equipamentos,
                limite_backups: Number(v ?? 0),
              })
            }
            min={0}
            size="sm"
          />
        </div>
      </div>
    </div>
  </>
  );
};
