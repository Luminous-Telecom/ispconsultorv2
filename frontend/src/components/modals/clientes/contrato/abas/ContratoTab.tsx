import React from 'react';
import { Plano, Banco, PaginatedResponse } from '@/types';
import { FormValue } from '@/types/common';
import { useI18n } from '@/contexts/I18nContext';
import { DocumentoSistema } from '@/services/documentoSistemaService';
import { DiasVencimento } from '@/services/diasVencimentoService';
import { TipoCobrancaContrato } from '@/services/tipoCobrancaContratoService';
import EntitySelectField from '@/components/ui/EntitySelectField';
import FormField from '@/components/ui/FormField';
import { ContratoForm } from '../types';

interface ContratoTabProps {
  formData: ContratoForm;
  errors: Partial<ContratoForm>;
  handleInputChange: (field: keyof ContratoForm, value: string | number | boolean | null) => void;
  planoSelecionado: Plano | null;
  bancoSelecionado: Banco | null;
  tipoCobrancaContratoSelecionado: TipoCobrancaContrato | null;
  modeloContratoSelecionado: DocumentoSistema | null;
  onPlanoSelect: (plano: Plano) => void;
  onBancoSelect: (banco: Banco) => void;
  onTipoCobrancaContratoSelect: (tipo: TipoCobrancaContrato) => void;
  onModeloContratoSelect: (modelo: DocumentoSistema) => void;
  planosData: PaginatedResponse<Plano> | Plano[] | undefined;
  bancosData: PaginatedResponse<Banco> | Banco[] | undefined;
  tiposCobrancaContratoData: TipoCobrancaContrato[];
  tipoCobrancaContratoFromContrato?: TipoCobrancaContrato | { id: number; nome: string; quantidade_titulos: number } | null;
  modelosContratoData: { success: boolean; data: DocumentoSistema[]; message: string } | undefined;
  diasVencimento: DiasVencimento[];
  onShowPlanoModal: () => void;
  onShowBancoModal: () => void;
  onShowTipoCobrancaContratoModal: () => void;
  onShowModeloContratoModal: () => void;
}

const ContratoTab: React.FC<ContratoTabProps> = ({
  formData,
  errors,
  handleInputChange,
  planoSelecionado,
  bancoSelecionado,
  tipoCobrancaContratoSelecionado,
  modeloContratoSelecionado,
  onPlanoSelect,
  onBancoSelect,
  onTipoCobrancaContratoSelect,
  onModeloContratoSelect,
  planosData,
  bancosData,
  tiposCobrancaContratoData,
  tipoCobrancaContratoFromContrato,
  modelosContratoData,
  diasVencimento,
  onShowPlanoModal,
  onShowBancoModal,
  onShowTipoCobrancaContratoModal,
  onShowModeloContratoModal
}) => {
  const { t } = useI18n();
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
    <div className="d-flex flex-column gap-2">
      {/* Plano */}
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
        label={t('form.plan')}
        idFieldTitle={t('form.enterClientId')}
        error={errors.plano_id}
        required
      />

      {/* Status */}
      <div>
        <label htmlFor="status" className="form-label">
          {t('form.status')} <span className="text-danger ms-1">*</span>
        </label>
        <select
          id="status"
          name="status"
          className={`form-select ${errors.status ? 'is-invalid' : ''}`}
          value={formData.status}
          onChange={(e) => handleInputChange('status', e.target.value as 'ativo' | 'inativo' | 'suspenso')}
        >
          <option value="ativo">{t('status.active')}</option>
          <option value="inativo">{t('status.inactive')}</option>
          <option value="suspenso">{t('status.suspended')}</option>
        </select>
        {errors.status && <div className="invalid-feedback">{errors.status}</div>}
      </div>

      {/* Data de Início e Data de Fim lado a lado */}
      <div className="d-flex gap-2">
        <div className="flex-fill">
          <FormField
            name="data_inicio"
            type="date"
            label={t('form.startDate')}
            required={true}
            size="md"
            value={formData.data_inicio}
            onChange={(value) => handleInputChange('data_inicio', value as string)}
            error={errors.data_inicio}
            isInvalid={!!errors.data_inicio}
          />
        </div>
        <div className="flex-fill">
          <FormField
            name="data_fim"
            type="date"
            label={t('form.endDate')}
            size="md"
            value={formData.data_fim}
            onChange={(value) => handleInputChange('data_fim', value as string)}
          />
        </div>
      </div>

      {/* Dia de Vencimento e Banco lado a lado */}
      <div className="d-flex gap-2">
        <div className="flex-fill">
          <label htmlFor="dia_vencimento_id" className="form-label">
            {t('form.dueDay')} <span className="text-danger ms-1">*</span>
          </label>
          <select
            id="dia_vencimento_id"
            name="dia_vencimento_id"
            className={`form-select ${errors.dia_vencimento_id ? 'is-invalid' : ''}`}
            value={formData.dia_vencimento_id || 0}
            onChange={(e) => handleInputChange('dia_vencimento_id', parseInt(e.target.value))}
          >
            <option value={0}>{t('ui.selectOption')}</option>
            {diasVencimento
              .filter((item) => item.ativo)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {t('other.day')} {String(item.dia).padStart(2, '0')}
                </option>
              ))}
          </select>
          {errors.dia_vencimento_id && <div className="invalid-feedback">{errors.dia_vencimento_id}</div>}
        </div>
        <div className="flex-fill">
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
            label={t('form.bank')}
            required
          />

          <EntitySelectField
            value={(tipoCobrancaContratoSelecionado?.id ?? formData.tipo_cobranca_contrato_id) || 0}
            onChange={(value) => {
              if (value === 0) {
                handleInputChange('tipo_cobranca_contrato_id', null);
              } else {
                const tipo = tiposCobrancaContratoData.find((t) => t.id === value)
                  ?? (tipoCobrancaContratoSelecionado?.id === value ? tipoCobrancaContratoSelecionado : null);
                if (tipo) onTipoCobrancaContratoSelect(tipo);
              }
            }}
            onShowModal={onShowTipoCobrancaContratoModal}
            entities={[
              { id: 0, nome: t('ui.selectOption') },
              ...tiposCobrancaContratoData.map((t) => ({ id: t.id, nome: `${t.nome} (${t.quantidade_titulos}x)` })),
              ...(tipoCobrancaContratoSelecionado && !tiposCobrancaContratoData.some((t) => t.id === tipoCobrancaContratoSelecionado!.id)
                ? [{ id: tipoCobrancaContratoSelecionado.id, nome: `${tipoCobrancaContratoSelecionado.nome} (${tipoCobrancaContratoSelecionado.quantidade_titulos}x)` }]
                : []),
              ...(tipoCobrancaContratoFromContrato && formData.tipo_cobranca_contrato_id === tipoCobrancaContratoFromContrato.id
                && !tiposCobrancaContratoData.some((t) => t.id === tipoCobrancaContratoFromContrato!.id)
                ? [{ id: tipoCobrancaContratoFromContrato.id, nome: `${tipoCobrancaContratoFromContrato.nome} (${tipoCobrancaContratoFromContrato.quantidade_titulos}x)` }]
                : [])
            ]}
            label={t('modal.billingType')}
            required
          />
        </div>
      </div>

      {/* Descontos lado a lado */}
      <div className="d-flex gap-2">
        <div className="flex-fill">
          <FormField
            name="desconto_percentual"
            type="number"
            label={t('form.discountPercent')}
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
        <div className="flex-fill">
          <FormField
            name="desconto_valor"
            type="number"
            label={t('form.discountValue')}
            placeholder={t('placeholder.discountValue')}
            size="md"
            value={descontoValorDisplay}
            onChange={handleDescontoValorChange}
            error={errors.desconto_valor?.toString()}
            isInvalid={!!errors.desconto_valor}
            min={0}
            step={0.01}
          />
        </div>
      </div>

      {/* Data Validade Desconto e Isento Mensalidade lado a lado */}
      <div className="d-flex gap-2 align-items-end">
        <div className="flex-fill">
          <FormField
            name="data_validade_desconto"
            type="date"
            label={t('form.discountValidity')}
            size="md"
            value={formData.data_validade_desconto}
            onChange={(value) => handleInputChange('data_validade_desconto', value as string)}
          />
        </div>
        <div className="flex-fill">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="isento_mensalidade"
              name="isento_mensalidade"
              checked={formData.isento_mensalidade}
              onChange={(e) => handleInputChange('isento_mensalidade', e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label className="form-check-label" htmlFor="isento_mensalidade" style={{ cursor: 'pointer' }}>
              {t('form.exemptFromMonthlyFee')}
            </label>
          </div>
        </div>
      </div>

      {/* Modelo de Contrato */}
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
        label={t('form.contractModel')}
        idFieldTitle={t('form.enterContractModelId')}
        helpText={t('form.selectContractModelHelp')}
        error={errors.modelo_documento_id}
        required
      />

      {/* Observações */}
      <FormField
        name="observacoes"
        type="textarea"
        label={t('form.observations')}
        size="md"
        value={formData.observacoes}
        onChange={(value) => handleInputChange('observacoes', value as string)}
        rows={3}
      />
    </div>
  );
};

export default ContratoTab;
