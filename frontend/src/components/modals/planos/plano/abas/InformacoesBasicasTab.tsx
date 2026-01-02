import React from 'react';
import { FormValue } from '@/types/common';
import FormField from '@/components/ui/FormField';
import { PlanoTabProps } from '../types';

const InformacoesBasicasTab: React.FC<PlanoTabProps> = ({
  formData,
  errors,
  handleInputChange,
  isSubmitting
}) => {
  return (
    <>
      <div className="row g-0">
        <div className="col-md-6">
          <div className="mb-0">
            <FormField
              name="nome_plano"
              type="text"
              label="Nome do Plano"
              placeholder="Ex: Plano Premium"
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

        <div className="col-md-6">
          <div className="mb-0">
            <FormField
              name="tipo_servico"
              type="select"
              label="Tipo de Serviço"
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
              options={[
                { value: 'suporte', label: 'Suporte' },
                { value: 'infraestrutura', label: 'Infraestrutura' },
                { value: 'consultoria', label: 'Consultoria' }
              ]}
            />
          </div>
        </div>
      </div>

      <div className="mb-2">
        <FormField
          name="descricao"
          type="textarea"
          label="Descrição"
          placeholder="Descrição detalhada do plano"
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

      <div className="row">
        <div className="col-md-6">
          <div className="mb-0">
            <FormField
              name="valor_mensal"
              type="number"
              label="Valor Mensal"
              placeholder="0.00"
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

        <div className="col-md-6">
          <div className="mb-0">
            <FormField
              name="quantidade_usuarios"
              type="number"
              label="Quantidade de Usuários"
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

      <div className="row">
        <div className="col-md-6">
          <div className="mb-0">
            <FormField
              name="data_inicio"
              type="date"
              label="Data de Início"
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

        <div className="col-md-6">
          <div className="mb-0">
            <FormField
              name="data_fim"
              type="date"
              label="Data de Fim"
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

      <div className="row">
        <div className="col-md-4">
          <div className="mb-0">
            <FormField
              name="periodicidade"
              type="select"
              label="Periodicidade"
              size="sm"
              value={formData.periodicidade}
              onChange={(value: FormValue) => {
                const stringValue = typeof value === 'string' ? value : String(value || '');
                handleInputChange('periodicidade', stringValue as PlanoTabProps['formData']['periodicidade']);
              }}
              disabled={isSubmitting}
              options={[
                { value: 'mensal', label: 'Mensal' },
                { value: 'trimestral', label: 'Trimestral' },
                { value: 'semestral', label: 'Semestral' },
                { value: 'anual', label: 'Anual' },
                { value: 'bimestral', label: 'Bimestral' },
                { value: 'quinzenal', label: 'Quinzenal' },
                { value: 'semanal', label: 'Semanal' }
              ]}
            />
          </div>
        </div>

        <div className="col-md-4">
          <div className="mb-0">
            <FormField
              name="status"
              type="select"
              label="Status"
              size="sm"
              value={formData.status}
              onChange={(value: FormValue) => {
                const stringValue = typeof value === 'string' ? value : String(value || '');
                handleInputChange('status', stringValue as PlanoTabProps['formData']['status']);
              }}
              disabled={isSubmitting}
              options={[
                { value: 'ativo', label: 'Ativo' },
                { value: 'inativo', label: 'Inativo' }
              ]}
            />
          </div>
        </div>

        <div className="col-md-4">
          <div className="mb-0">
            <FormField
              name="renovacao_automatica"
              type="checkbox"
              label="Renovação Automática"
              value={formData.renovacao_automatica}
              onChange={(value: FormValue) => handleInputChange('renovacao_automatica', !!value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default InformacoesBasicasTab;

