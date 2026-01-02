import React from 'react';
import { Plano, Banco, PaginatedResponse } from '@/types';
import { FormValue } from '@/types/common';
import { DocumentoSistema } from '@/services/documentoSistemaService';
import { DiasVencimento } from '@/services/diasVencimentoService';
import EntitySelectField from '@/components/ui/EntitySelectField';
import FormField from '@/components/ui/FormField';
import { ContratoForm } from '../types';

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
  planosData: PaginatedResponse<Plano> | Plano[] | undefined;
  bancosData: PaginatedResponse<Banco> | Banco[] | undefined;
  modelosContratoData: { success: boolean; data: DocumentoSistema[]; message: string } | undefined;
  diasVencimento: DiasVencimento[];
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
  const [descontoPercentualDisplay, setDescontoPercentualDisplay] = React.useState<string>(
    formData.desconto_percentual > 0 ? formData.desconto_percentual.toString() : ''
  );
  const [descontoValorDisplay, setDescontoValorDisplay] = React.useState<string>(
    formData.desconto_valor > 0 ? formData.desconto_valor.toString() : ''
  );

  React.useEffect(() => {
    setDescontoPercentualDisplay(formData.desconto_percentual > 0 ? formData.desconto_percentual.toString() : '');
  }, [formData.desconto_percentual]);

  React.useEffect(() => {
    setDescontoValorDisplay(formData.desconto_valor > 0 ? formData.desconto_valor.toString() : '');
  }, [formData.desconto_valor]);

  const valorPlano = Number(planoSelecionado?.valor_mensal || 0);

  const handleDescontoPercentualChange = (value: FormValue) => {
    const stringValue = String(value || '');
    setDescontoPercentualDisplay(stringValue);
    
    if (!stringValue.trim()) {
      handleInputChange('desconto_percentual', 0);
      handleInputChange('desconto_valor', 0);
      setDescontoValorDisplay('');
      return;
    }
    
    const percentual = Number(stringValue);
    if (isNaN(percentual)) {
      handleInputChange('desconto_percentual', 0);
      handleInputChange('desconto_valor', 0);
      setDescontoValorDisplay('');
      return;
    }
    
    const percentualArredondado = Math.round(percentual * 100) / 100;
    handleInputChange('desconto_percentual', percentualArredondado);
    
    if (percentualArredondado > 0 && valorPlano > 0) {
      const valorEquivalente = Math.round((valorPlano * percentualArredondado / 100) * 100) / 100;
      handleInputChange('desconto_valor', valorEquivalente);
      setDescontoValorDisplay(valorEquivalente.toString());
    } else {
      handleInputChange('desconto_valor', 0);
      setDescontoValorDisplay('');
    }
  };

  const handleDescontoValorChange = (value: FormValue) => {
    const stringValue = String(value || '');
    setDescontoValorDisplay(stringValue);
    
    if (!stringValue.trim()) {
      handleInputChange('desconto_valor', 0);
      handleInputChange('desconto_percentual', 0);
      setDescontoPercentualDisplay('');
      return;
    }
    
    const valor = Number(stringValue);
    if (isNaN(valor)) {
      handleInputChange('desconto_valor', 0);
      handleInputChange('desconto_percentual', 0);
      setDescontoPercentualDisplay('');
      return;
    }
    
    const valorArredondado = Math.round(valor * 100) / 100;
    handleInputChange('desconto_valor', valorArredondado);
    
    if (valorArredondado > 0 && valorPlano > 0) {
      const percentualEquivalente = Math.round((valorArredondado / valorPlano * 100) * 100) / 100;
      handleInputChange('desconto_percentual', percentualEquivalente);
      setDescontoPercentualDisplay(percentualEquivalente.toString());
    } else {
      handleInputChange('desconto_percentual', 0);
      setDescontoPercentualDisplay('');
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
          onChange={(value) => handleInputChange('data_inicio', value as string)}
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
          onChange={(value) => handleInputChange('data_fim', value as string)}
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
            .filter((item) => item.ativo)
            .map((item) => (
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
            const banco = (Array.isArray(bancosData) ? bancosData : bancosData?.data || []).find((b) => b.id === value);
            if (banco) {
              onBancoSelect(banco);
            }
          }}
          onShowModal={onShowBancoModal}
          entities={(Array.isArray(bancosData) ? bancosData : bancosData?.data || []).map((b) => ({
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
          value={descontoPercentualDisplay}
          onChange={handleDescontoPercentualChange}
          error={errors.desconto_percentual?.toString()}
          isInvalid={!!errors.desconto_percentual}
          min={0}
          max={100}
          step="any"
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
          value={descontoValorDisplay}
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
          onChange={(value) => handleInputChange('data_validade_desconto', value as string)}
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
            const modelo = (Array.isArray(modelosContratoData) ? modelosContratoData : modelosContratoData?.data || []).find((m) => m.id === value);
            if (modelo) {
              onModeloContratoSelect(modelo);
            }
          }}
          onShowModal={onShowModeloContratoModal}
          entities={(Array.isArray(modelosContratoData) ? modelosContratoData : modelosContratoData?.data || []).map((m) => ({
            id: m.id,
            nome: m.nome
          }))}
          label="Modelo de Contrato"
          idFieldTitle="Digite o ID do modelo de contrato"
          helpText="Selecione um modelo de contrato cadastrado no sistema"
          error={errors.modelo_documento_id}
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
          onChange={(value) => handleInputChange('observacoes', value as string)}
          rows={3}
        />
      </div>
    </div>
  );
};

export default ContratoTab;
