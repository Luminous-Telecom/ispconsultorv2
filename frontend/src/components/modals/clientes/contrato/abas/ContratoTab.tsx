import React from 'react';
import FormField from '../../../../ui/FormField';
import EntitySelectField from '../../../../../components/ui/EntitySelectField';
import { Plano, Banco } from '../../../../../types';
import { DocumentoSistema } from '../../../../../services/documentoSistemaService';

interface ContratoForm {
  plano_id: number;
  desconto_percentual: number;
  desconto_valor: number;
  data_inicio: string;
  data_fim: string;
  status: 'ativo' | 'inativo' | 'suspenso';
  observacoes: string;
  isento_mensalidade: boolean;
  dia_vencimento_id: number;
  conta_boleto: number;
  data_validade_desconto: string;
  modelo_contrato_id: number;
}

interface ContratoTabProps {
  formData: ContratoForm;
  errors: Partial<ContratoForm>;
  handleInputChange: (field: keyof ContratoForm, value: string | number | boolean) => void;
  planoSelecionado: Plano | null;
  bancoSelecionado: Banco | null;
  modeloContratoSelecionado: DocumentoSistema | null;
  onPlanoSelect: (plano: Plano) => void;
  onBancoSelect: (banco: Banco) => void;
  onModeloContratoSelect: (modelo: DocumentoSistema) => void;
  planosData: any;
  bancosData: any;
  modelosContratoData: any;
  diasVencimento: any[];
  onShowPlanoModal: () => void;
  onShowBancoModal: () => void;
  onShowModeloContratoModal: () => void;
}

const ContratoTab: React.FC<ContratoTabProps> = ({
  formData,
  errors,
  handleInputChange,
  planoSelecionado,
  bancoSelecionado,
  modeloContratoSelecionado,
  onPlanoSelect,
  onBancoSelect,
  onModeloContratoSelect,
  planosData,
  bancosData,
  modelosContratoData,
  diasVencimento,
  onShowPlanoModal,
  onShowBancoModal,
  onShowModeloContratoModal
}) => {
  // Handlers simplificados para desconto
  const handleDescontoPercentualChange = (value: string | number) => {
    const percentual = typeof value === 'string' ? parseFloat(value) || 0 : value;
    handleInputChange('desconto_percentual', percentual);
    
    // Calcular valor do desconto baseado no valor do plano selecionado
    if (planoSelecionado?.valor_mensal) {
      const valorPlano = parseFloat(String(planoSelecionado.valor_mensal));
      const descontoValor = percentual > 0 ? (valorPlano * percentual) / 100 : 0;
      handleInputChange('desconto_valor', descontoValor);
    }
  };

  const handleDescontoValorChange = (value: string | number) => {
    const valor = typeof value === 'string' ? parseFloat(value) || 0 : value;
    handleInputChange('desconto_valor', valor);
    
    // Calcular percentual do desconto baseado no valor do plano selecionado
    if (planoSelecionado?.valor_mensal) {
      const valorPlano = parseFloat(String(planoSelecionado.valor_mensal));
      const percentual = valor > 0 && valorPlano > 0 ? (valor * 100) / valorPlano : 0;
      handleInputChange('desconto_percentual', percentual);
    }
  };
  return (
    <div className="row">
      {/* Plano */}
      <div className="col-md-6 mb-2">
        <EntitySelectField
          value={planoSelecionado?.id || 0}
          onChange={(value) => {
            const plano = (Array.isArray(planosData) ? planosData : planosData?.data || []).find((p: Plano) => p.id === value);
            if (plano) {
              onPlanoSelect(plano);
            }
          }}
          onShowModal={onShowPlanoModal}
          entities={(Array.isArray(planosData) ? planosData : planosData?.data || []).map((p: Plano) => ({
            id: p.id,
            nome: p.nome_plano
          }))}
          label="Plano"
          idFieldTitle="Digite o ID do plano"
          error={errors.plano_id}
          required
        />
      </div>

      {/* Status */}
      <div className="col-md-6 mb-2">
        <label htmlFor="status" className="form-label">
          Status <span className="text-danger ms-1">*</span>
        </label>
        <select
          id="status"
          name="status"
          className={`form-select ${errors.status ? 'is-invalid' : ''}`}
          value={formData.status}
          onChange={(e) => handleInputChange('status', e.target.value as 'ativo' | 'inativo' | 'suspenso')}
        >
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="suspenso">Suspenso</option>
        </select>
        {errors.status && <div className="invalid-feedback">{errors.status}</div>}
      </div>

      {/* Data de Início */}
      <div className="col-md-6 mb-2">
        <FormField
          name="data_inicio"
          type="date"
          label="Data de Início"
          required={true}
          size="md"
          value={formData.data_inicio}
          onChange={(value, name) => handleInputChange('data_inicio', value)}
          error={errors.data_inicio}
          isInvalid={!!errors.data_inicio}
        />
      </div>

      {/* Data de Fim */}
      <div className="col-md-6 mb-2">
        <FormField
          name="data_fim"
          type="date"
          label="Data de Fim"
          size="md"
          value={formData.data_fim}
          onChange={(value, name) => handleInputChange('data_fim', value)}
        />
      </div>

      {/* Dia de Vencimento */}
      <div className="col-md-6 mb-2">
        <label htmlFor="dia_vencimento_id" className="form-label">
          Dia de Vencimento <span className="text-danger ms-1">*</span>
        </label>
        <select
          id="dia_vencimento_id"
          name="dia_vencimento_id"
          className={`form-select ${errors.dia_vencimento_id ? 'is-invalid' : ''}`}
          value={formData.dia_vencimento_id || 0}
          onChange={(e) => handleInputChange('dia_vencimento_id', parseInt(e.target.value))}
        >
          <option value={0}>Selecione</option>
          {diasVencimento
            .filter((item: any) => item.ativo)
            .map((item: any) => (
              <option key={item.id} value={item.id}>
                Dia {String(item.dia).padStart(2, '0')}
              </option>
            ))}
        </select>
        {errors.dia_vencimento_id && <div className="invalid-feedback">{errors.dia_vencimento_id}</div>}
      </div>

      {/* Banco para Boleto */}
      <div className="col-md-6 mb-2">
        <EntitySelectField
          value={bancoSelecionado?.id || 0}
          onChange={(value) => {
            const banco = (Array.isArray(bancosData) ? bancosData : bancosData?.data || []).find((b: any) => b.id === value);
            if (banco) {
              onBancoSelect(banco);
            }
          }}
          onShowModal={onShowBancoModal}
          entities={(Array.isArray(bancosData) ? bancosData : bancosData?.data || []).map((b: any) => ({
            id: b.id,
            nome: b.nome
          }))}
          label="Banco para Boleto"
          idFieldTitle="Digite o ID do banco"
          error={errors.conta_boleto}
          required
        />
      </div>

      {/* Desconto Percentual */}
      <div className="col-md-6 mb-2">
        <FormField
          name="desconto_percentual"
          type="number"
          label="Desconto Percentual (%)"
          placeholder="0.00"
          size="md"
          value={formData.desconto_percentual}
          onChange={handleDescontoPercentualChange}
          error={errors.desconto_percentual?.toString()}
          isInvalid={!!errors.desconto_percentual}
          min={0}
          max={100}
          step={0.01}
        />
      </div>

      {/* Desconto Valor */}
      <div className="col-md-6 mb-2">
        <FormField
          name="desconto_valor"
          type="number"
          label="Desconto Valor (R$)"
          placeholder="0.00"
          size="md"
          value={formData.desconto_valor}
          onChange={handleDescontoValorChange}
          error={errors.desconto_valor?.toString()}
          isInvalid={!!errors.desconto_valor}
          min={0}
          step={0.01}
        />
      </div>

      {/* Data Validade Desconto */}
      <div className="col-md-6 mb-2">
        <FormField
          name="data_validade_desconto"
          type="date"
          label="Data Validade Desconto"
          size="md"
          value={formData.data_validade_desconto}
          onChange={(value, name) => handleInputChange('data_validade_desconto', value)}
        />
      </div>

      {/* Isento Mensalidade */}
      <div className="col-md-6 mb-2">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="isento_mensalidade"
            name="isento_mensalidade"
            checked={formData.isento_mensalidade}
            onChange={(e) => handleInputChange('isento_mensalidade', e.target.checked)}
          />
          <label className="form-check-label" htmlFor="isento_mensalidade">
            Isento de Mensalidade
          </label>
        </div>
      </div>

      {/* Modelo de Contrato */}
      <div className="col-md-12 mb-2">
        <EntitySelectField
          value={modeloContratoSelecionado?.id || 0}
          onChange={(value) => {
            const modelo = (Array.isArray(modelosContratoData) ? modelosContratoData : modelosContratoData?.data || []).find((m: any) => m.id === value);
            if (modelo) {
              onModeloContratoSelect(modelo);
            }
          }}
          onShowModal={onShowModeloContratoModal}
          entities={(Array.isArray(modelosContratoData) ? modelosContratoData : modelosContratoData?.data || []).map((m: any) => ({
            id: m.id,
            nome: m.nome
          }))}
          label="Modelo de Contrato"
          idFieldTitle="Digite o ID do modelo de contrato"
          helpText="Selecione um modelo de contrato cadastrado no sistema"
          error={errors.modelo_contrato_id}
          required
        />
      </div>

      {/* Observações */}
      <div className="col-12 mb-2">
        <FormField
          name="observacoes"
          type="textarea"
          label="Observações"
          size="md"
          value={formData.observacoes}
          onChange={(e: any) => handleInputChange('observacoes', e.value)}
          rows={3}
        />
      </div>
    </div>
  );
};

export default ContratoTab;
