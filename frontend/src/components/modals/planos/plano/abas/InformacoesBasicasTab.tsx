import React from 'react';
import { FormValue } from 'types/common';
import { useI18n } from 'contexts/I18nContext';
import FormField from 'components/ui/FormField';
import AtivoInativoField from 'components/ui/AtivoInativoField';
import { usePlanoModulos } from 'hooks/usePlanoModulos';
import { PlanoTabProps } from '../types';

const InformacoesBasicasTab: React.FC<PlanoTabProps> = ({
  formData,
  errors,
  handleInputChange,
  isSubmitting
}) => {
  const { t } = useI18n();
  const { modulos } = usePlanoModulos();
  const temBlockdomi = modulos !== null && modulos.includes('blockdomi');
  const planoJaBlockdomi = formData.tipo_servico === 'blockdomi';

  const tipoServicoOptions = [
    { value: 'infraestrutura', label: t('form.serviceTypeInfrastructure') },
    { value: 'consultoria', label: t('form.serviceTypeConsulting') },
    ...(temBlockdomi || planoJaBlockdomi ? [{ value: 'blockdomi', label: t('form.serviceTypeBlockdomi') }] : [])
  ];
  return (
    <>
      <div className="row g-2">
        <div className="col-12">
          <div className="mb-0">
            <FormField
              name="nome_plano"
              type="text"
              label={t('table.planName')}
              placeholder={t('form.planNamePlaceholder')}
              required={true}
              size="sm"
              value={formData.nome_plano}
              onChange={(value: FormValue) => {
                const stringValue = typeof value === 'string' ? value : String(value || '');
                handleInputChange('nome_plano', stringValue);
              }}
              error={errors.nome_plano}
              isInvalid={!!errors.nome_plano}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="col-12">
          <div className="mb-0">
            <FormField
              name="tipo_servico"
              type="select"
              label={t('table.serviceType')}
              required={true}
              size="sm"
              value={formData.tipo_servico}
              onChange={(value: FormValue) => {
                const stringValue = typeof value === 'string' ? value : String(value || '');
                handleInputChange('tipo_servico', stringValue as PlanoTabProps['formData']['tipo_servico']);
              }}
              error={errors.tipo_servico}
              isInvalid={!!errors.tipo_servico}
              disabled={isSubmitting}
              options={tipoServicoOptions}
            />
          </div>
        </div>
      </div>

      <div className="mb-2">
        <FormField
          name="descricao"
          type="textarea"
          label={t('form.description')}
          placeholder={t('form.planDescriptionPlaceholder')}
          size="sm"
          value={formData.descricao}
          onChange={(value: FormValue) => {
            const stringValue = typeof value === 'string' ? value : String(value || '');
            handleInputChange('descricao', stringValue);
          }}
          disabled={isSubmitting}
          rows={2}
        />
      </div>

      <div className="row g-2">
        <div className="col-12">
          <div className="mb-0">
            <FormField
              name="valor_mensal"
              type="number"
              label={t('table.monthlyValue')}
              placeholder={t('form.monthlyValuePlaceholder')}
              required={true}
              size="md"
              value={formData.valor_mensal === 0 ? '' : formData.valor_mensal}
              onChange={(value: FormValue) => {
                const rawValue = typeof value === 'string' || typeof value === 'number' ? value : String(value || '');
                const numValue = rawValue === '' || rawValue === 0 ? 0 : parseFloat(String(rawValue));
                handleInputChange('valor_mensal', isNaN(numValue) ? 0 : numValue);
              }}
              error={errors.valor_mensal?.toString()}
              isInvalid={!!errors.valor_mensal}
              disabled={isSubmitting}
              step={0.01}
            />
          </div>
        </div>

        <div className="col-12">
          <div className="mb-0">
            <FormField
              name="quantidade_usuarios"
              type="number"
              label={t('form.usersQuantity')}
              size="sm"
              value={formData.quantidade_usuarios === 0 ? '' : formData.quantidade_usuarios}
              onChange={(value: FormValue) => {
                const rawValue = typeof value === 'string' || typeof value === 'number' ? value : String(value || '');
                const intValue = rawValue === '' || rawValue === 0 ? 0 : parseInt(String(rawValue), 10);
                handleInputChange('quantidade_usuarios', isNaN(intValue) ? 0 : intValue);
              }}
              disabled={isSubmitting}
              min={1}
            />
          </div>
        </div>
      </div>

      <div className="row g-2">
        <div className="col-12">
          <div className="mb-0">
            <FormField
              name="data_inicio"
              type="date"
              label={t('form.startDate')}
              required={true}
              size="md"
              value={formData.data_inicio}
              onChange={(value: FormValue) => {
                const stringValue = typeof value === 'string' ? value : String(value || '');
                handleInputChange('data_inicio', stringValue);
              }}
              error={errors.data_inicio}
              isInvalid={!!errors.data_inicio}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="col-12">
          <div className="mb-0">
            <FormField
              name="data_fim"
              type="date"
              label={t('form.endDate')}
              size="sm"
              value={formData.data_fim}
              onChange={(value: FormValue) => {
                const stringValue = typeof value === 'string' ? value : String(value || '');
                handleInputChange('data_fim', stringValue);
              }}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>

      <div className="row g-2">
        <div className="col-12">
          <div className="mb-0">
            <AtivoInativoField
              value={formData.status === 'ativo'}
              onChange={v => handleInputChange('status', (v ? 'ativo' : 'inativo') as PlanoTabProps['formData']['status'])}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div className="col-12">
          <div className="mb-0">
            <AtivoInativoField
              value={formData.renovacao_automatica}
              onChange={(v) => handleInputChange('renovacao_automatica', v)}
              label={t('form.autoRenewal')}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default InformacoesBasicasTab;

