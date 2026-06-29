import React from 'react';
import FormField from 'components/ui/FormField';
import EntitySelectField from 'components/ui/EntitySelectField';
import AtivoInativoField from 'components/ui/AtivoInativoField';
import { LabelWithHelp } from 'components/ui/LabelWithHelp';
import { useI18n } from 'contexts/I18nContext';

export interface SaasContratoFormData {
  banco_id: number | '';
  dia_vencimento: number | '';
  plano_id: number | '';
  data_inicio: string;
  data_fim: string;
  tipo: 'mensal' | 'anual';
  valor: number | '';
  desconto_percentual: number;
  desconto_valor: number;
  data_validade_desconto: string;
  isento_mensalidade: boolean;
  observacoes: string;
  data_fim_desbloqueio_manual: string;
}

export interface SaasContratoFormFieldsProps {
  form: SaasContratoFormData;
  errors: Partial<Record<keyof SaasContratoFormData, string>>;
  descontoPercentualDisplay: string;
  descontoValorDisplay: string;
  planos: { id: number; nome: string; valor_mensal?: number; valor_anual?: number }[];
  bancosAtivos: { id: number; nome?: string; banco: string }[];
  diasVencimentoList: { id: number; dia: number }[];
  onPlanoChange: (planoId: number | '') => void;
  onShowPlanoModal: () => void;
  onShowBancoModal: () => void;
  onFieldChange: <K extends keyof SaasContratoFormData>(
    field: K,
    value: SaasContratoFormData[K]
  ) => void;
  onTipoChange: (tipo: 'mensal' | 'anual') => void;
  onDescontoPercentualChange: (v: unknown) => void;
  onDescontoValorChange: (v: unknown) => void;
  onClearError: (field: keyof SaasContratoFormData) => void;
}

const SaasContratoFormFields: React.FC<SaasContratoFormFieldsProps> = ({
  form,
  errors,
  descontoPercentualDisplay,
  descontoValorDisplay,
  planos,
  bancosAtivos,
  diasVencimentoList,
  onPlanoChange,
  onShowPlanoModal,
  onShowBancoModal,
  onFieldChange,
  onTipoChange,
  onDescontoPercentualChange,
  onDescontoValorChange,
  onClearError,
}) => {
  const { t } = useI18n();

  return (
    <div className="d-flex flex-column gap-2">
      <EntitySelectField
        label={t('form.plan')}
        required
        value={Number(form.plano_id) || 0}
        onChange={(value) => {
          onPlanoChange(value ? value : '');
          onClearError('plano_id');
        }}
        onShowModal={onShowPlanoModal}
        entities={planos.map((p) => ({ id: p.id, nome: p.nome }))}
        error={errors.plano_id}
        idFieldTitle={t('form.enterClientId')}
      />
      <div className="d-flex gap-2">
        <div className="flex-fill">
          <FormField
            name="data_inicio"
            type="date"
            label={t('form.startDate')}
            required
            size="md"
            value={form.data_inicio}
            onChange={(v) => onFieldChange('data_inicio', String(v ?? ''))}
            error={errors.data_inicio}
          />
        </div>
        <div className="flex-fill">
          <FormField
            name="data_fim"
            type="date"
            label={t('form.endDate')}
            size="md"
            value={form.data_fim}
            onChange={(v) => onFieldChange('data_fim', String(v ?? ''))}
          />
        </div>
      </div>
      <div className="d-flex gap-2">
        <div className="flex-fill">
          <LabelWithHelp htmlFor="dia_vencimento_saas" className="form-label">
            {t('form.dueDay')}
          </LabelWithHelp>
          <select
            id="dia_vencimento_saas"
            name="dia_vencimento"
            className="form-select"
            value={form.dia_vencimento === '' ? '' : form.dia_vencimento}
            onChange={(e) =>
              onFieldChange('dia_vencimento', e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">{t('ui.selectOption')}</option>
            {diasVencimentoList.map((item) => (
              <option key={item.dia} value={item.dia}>
                {t('other.day')} {String(item.dia).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-fill">
          <EntitySelectField
            label={t('form.bank')}
            value={Number(form.banco_id) || 0}
            onChange={(value) => {
              onFieldChange('banco_id', value ? value : '');
              onClearError('banco_id');
            }}
            onShowModal={onShowBancoModal}
            entities={bancosAtivos.map((b) => ({ id: b.id, nome: b.nome || b.banco }))}
            error={errors.banco_id}
          />
        </div>
      </div>
      <div className="d-flex gap-2">
        <div className="flex-fill">
          <FormField
            name="tipo"
            type="select"
            label={t('form.type')}
            value={form.tipo}
            onChange={(v) => onTipoChange((v as 'mensal' | 'anual') || 'mensal')}
            options={[
              { value: 'mensal', label: t('form.periodicityMonthly') ?? 'Mensal' },
              { value: 'anual', label: t('form.periodicityAnnual') ?? 'Anual' },
            ]}
            size="md"
          />
        </div>
        <div className="flex-fill">
          <FormField
            name="valor"
            type="number"
            label={t('form.value')}
            value={form.valor === '' ? '' : form.valor}
            onChange={(v) => onFieldChange('valor', v !== '' && v != null ? Number(v) : '')}
            min={0}
            step={0.01}
            size="md"
          />
        </div>
      </div>
      <div className="d-flex gap-2">
        <div className="flex-fill">
          <FormField
            name="desconto_percentual"
            type="number"
            label={t('form.discountPercent')}
            placeholder="0.00"
            size="md"
            value={descontoPercentualDisplay}
            onChange={onDescontoPercentualChange}
            min={0}
            max={100}
            step="any"
          />
        </div>
        <div className="flex-fill">
          <FormField
            name="desconto_valor"
            type="number"
            label={t('form.discountValue')}
            placeholder={t('placeholder.discountValue')}
            size="md"
            value={descontoValorDisplay}
            onChange={onDescontoValorChange}
            min={0}
            step={0.01}
          />
        </div>
      </div>
      <FormField
        name="data_validade_desconto"
        type="date"
        label={t('form.discountValidity')}
        size="md"
        value={form.data_validade_desconto}
        onChange={(v) => onFieldChange('data_validade_desconto', String(v ?? ''))}
      />

      <AtivoInativoField
        value={!!form.isento_mensalidade}
        onChange={(v) => onFieldChange('isento_mensalidade', v)}
        label={t('form.exemptFromMonthlyFee')}
        name="saas-contrato-isento-mensalidade"
      />
      <FormField
        name="observacoes"
        type="textarea"
        label={t('form.observations')}
        value={form.observacoes}
        onChange={(v) => onFieldChange('observacoes', String(v ?? ''))}
        size="md"
        rows={3}
      />
      <FormField
        name="data_fim_desbloqueio_manual"
        type="date"
        label={t('saas.dataNaoBloquearAte')}
        value={form.data_fim_desbloqueio_manual}
        onChange={(v) => onFieldChange('data_fim_desbloqueio_manual', String(v ?? ''))}
        size="md"
      />
    </div>
  );
};

export default SaasContratoFormFields;
