import React, { useMemo, useState } from 'react';
import { Cliente, Plano, Banco, PaginatedResponse } from 'types';
import { FormValue } from 'types/common';
import { useI18n } from 'contexts/I18nContext';
import { DocumentoSistema } from 'services/documentoSistemaService';
import { DiasVencimento } from 'services/diasVencimentoService';
import { TipoCobrancaContrato } from 'services/tipoCobrancaContratoService';
import EntitySelectField from 'components/ui/EntitySelectField';
import { useEntityRecordEdit } from 'hooks/useEntityRecordEdit';
import FormField from 'components/ui/FormField';
import AtivoInativoField from 'components/ui/AtivoInativoField';
import { EntityIdField } from 'components/ui';
import { ContratoForm } from '../types';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';
import { getClienteRazaoSocialLabel } from 'utils/clienteDisplay';

interface ContratoTabProps {
  entityId?: number | null;
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
  clienteData?: Cliente | null;
  onShowPlanoModal: () => void;
  onShowBancoModal: () => void;
  onShowTipoCobrancaContratoModal: () => void;
  onShowModeloContratoModal: () => void;
}

const ContratoTab: React.FC<ContratoTabProps> = ({
  entityId,
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
  clienteData,
  onShowPlanoModal,
  onShowBancoModal,
  onShowTipoCobrancaContratoModal,
  onShowModeloContratoModal
}) => {
  const { t } = useI18n();
  const clienteEdit = useEntityRecordEdit('cliente');
  const planoEdit = useEntityRecordEdit('plano');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState('');
  const bancoEdit = useEntityRecordEdit('banco');
  const tipoCobrancaEdit = useEntityRecordEdit('tipoCobranca');
  const modeloEdit = useEntityRecordEdit('modeloContrato');
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

  const planosList = useMemo(
    () => (Array.isArray(planosData) ? planosData : (planosData?.data ?? [])),
    [planosData]
  );
  const bancosList = useMemo(
    () => (Array.isArray(bancosData) ? bancosData : bancosData?.data ?? []),
    [bancosData]
  );
  const planosEntities = useMemo(() => {
    const base = planosList.map((p: Plano) => ({ id: p.id, nome: p.nome_plano }));
    if (planoSelecionado?.id && !base.some((e) => e.id === planoSelecionado.id)) {
      return [{ id: planoSelecionado.id, nome: planoSelecionado.nome_plano }, ...base];
    }
    return base;
  }, [planosList, planoSelecionado?.id, planoSelecionado?.nome_plano]);

  const tipoCobrancaEntities = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of tiposCobrancaContratoData) {
      map.set(item.id, `${item.nome} (${item.quantidade_titulos}x)`);
    }
    if (tipoCobrancaContratoSelecionado && !map.has(tipoCobrancaContratoSelecionado.id)) {
      map.set(
        tipoCobrancaContratoSelecionado.id,
        `${tipoCobrancaContratoSelecionado.nome} (${tipoCobrancaContratoSelecionado.quantidade_titulos}x)`
      );
    }
    if (tipoCobrancaContratoFromContrato && !map.has(tipoCobrancaContratoFromContrato.id)) {
      map.set(
        tipoCobrancaContratoFromContrato.id,
        `${tipoCobrancaContratoFromContrato.nome} (${tipoCobrancaContratoFromContrato.quantidade_titulos}x)`
      );
    }
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [tiposCobrancaContratoData, tipoCobrancaContratoSelecionado, tipoCobrancaContratoFromContrato]);

  const resolveTipoCobranca = (value: number): TipoCobrancaContrato | null => {
    const fromList = tiposCobrancaContratoData.find((item) => item.id === value);
    if (fromList) return fromList;
    if (tipoCobrancaContratoSelecionado?.id === value) return tipoCobrancaContratoSelecionado;
    if (tipoCobrancaContratoFromContrato?.id === value) {
      return tipoCobrancaContratoFromContrato as TipoCobrancaContrato;
    }
    return null;
  };

  const diaVencimentoOptions = useMemo(
    () => [
      { value: 0, label: t('ui.selectOption') },
      ...diasVencimento
        .filter((item) => item.ativo)
        .map((item) => ({
          value: item.id,
          label: `${t('other.day')} ${String(item.dia).padStart(2, '0')}`,
        })),
    ],
    [diasVencimento, t]
  );

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

  const clienteIdSelecionado = formData.cliente_id || 0;
  const clienteNome = clienteData && clienteData.id === clienteIdSelecionado
    ? getClienteRazaoSocialLabel(clienteData, '')
    : clienteNomeSelecionado;
  const clienteEntities = clienteIdSelecionado > 0
    ? [{ id: clienteIdSelecionado, nome: clienteNome || `Cliente #${clienteIdSelecionado}` }]
    : [];

  return (
    <div className="row g-2">
      <EntityIdField id={entityId} />
      <div className="col-12">
        <EntitySelectField
          value={clienteIdSelecionado}
          onChange={(value) => handleInputChange('cliente_id', value || 0)}
          onShowModal={() => setShowClienteModal(true)}
          onEdit={() => clienteEdit.open(clienteIdSelecionado)}
          entities={clienteEntities}
          label={t('form.client')}
          placeholder={t('placeholder.selectClient')}
          searchButtonTitle={t('ui.selectClient')}
          error={errors.cliente_id}
          required
        />
      </div>
      <div className="col-12">
        <EntitySelectField
          value={formData.plano_id || planoSelecionado?.id || 0}
          onChange={(value) => {
            if (!value) {
              handleInputChange('plano_id', 0);
              return;
            }
            handleInputChange('plano_id', value);
            const plano = planosList.find((p: Plano) => p.id === value) ?? (planoSelecionado?.id === value ? planoSelecionado : null);
            if (plano) {
              onPlanoSelect(plano);
            }
          }}
          onShowModal={onShowPlanoModal}
          onEdit={() => planoEdit.open(formData.plano_id || planoSelecionado?.id || 0)}
          entities={planosEntities}
          label={t('form.plan')}
          idFieldTitle={t('form.enterClientId')}
          error={errors.plano_id}
          required
        />
      </div>

      <div className="col-12">
        <FormField
          name="status"
          type="select"
          label={t('form.status')}
          required
          size="md"
          value={formData.status}
          onChange={(value) => handleInputChange('status', value as 'ativo' | 'inativo' | 'suspenso')}
          error={errors.status}
          isInvalid={!!errors.status}
          options={[
            { value: 'ativo', label: t('status.active') },
            { value: 'inativo', label: t('status.inactive') },
            { value: 'suspenso', label: t('status.suspended') },
          ]}
        />
      </div>

      <div className="col-12">
        <FormField
          name="data_inicio"
          type="date"
          label={t('form.startDate')}
          required
          size="md"
          value={formData.data_inicio}
          onChange={(value) => handleInputChange('data_inicio', value as string)}
          error={errors.data_inicio}
          isInvalid={!!errors.data_inicio}
        />
      </div>

      <div className="col-12">
        <FormField
          name="data_fim"
          type="date"
          label={t('form.endDate')}
          size="md"
          value={formData.data_fim}
          onChange={(value) => handleInputChange('data_fim', value as string)}
        />
      </div>

      <div className="col-12">
        <FormField
          name="dia_vencimento_id"
          type="select"
          label={t('form.dueDay')}
          required
          size="md"
          value={formData.dia_vencimento_id || 0}
          onChange={(value) => handleInputChange('dia_vencimento_id', parseInt(String(value), 10))}
          error={errors.dia_vencimento_id?.toString()}
          isInvalid={!!errors.dia_vencimento_id}
          options={diaVencimentoOptions}
        />
      </div>

      <div className="col-12">
        <EntitySelectField
          value={formData.conta_boleto || bancoSelecionado?.id || 0}
          onChange={(value) => {
            if (!value) {
              handleInputChange('conta_boleto', 0);
              return;
            }
            handleInputChange('conta_boleto', value);
            const banco = bancosList.find((b) => b.id === value);
            if (banco) {
              onBancoSelect(banco);
            }
          }}
          onShowModal={onShowBancoModal}
          onEdit={() => bancoEdit.open(formData.conta_boleto || bancoSelecionado?.id || 0)}
          entities={bancosList.map((b) => ({
            id: b.id,
            nome: b.nome
          }))}
          label={t('form.bank')}
          required
        />
      </div>

      <div className="col-12">
        <EntitySelectField
          value={(formData.tipo_cobranca_contrato_id ?? tipoCobrancaContratoSelecionado?.id) || 0}
          onChange={(value) => {
            if (!value) {
              handleInputChange('tipo_cobranca_contrato_id', null);
              return;
            }
            handleInputChange('tipo_cobranca_contrato_id', value);
            const tipo = resolveTipoCobranca(value);
            if (tipo) {
              onTipoCobrancaContratoSelect(tipo);
            }
          }}
          onShowModal={onShowTipoCobrancaContratoModal}
          onEdit={() => tipoCobrancaEdit.open((formData.tipo_cobranca_contrato_id ?? tipoCobrancaContratoSelecionado?.id) || 0)}
          entities={tipoCobrancaEntities}
          label={t('modal.billingType')}
          required
        />
      </div>

      <div className="col-12">
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

      <div className="col-12">
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

      <div className="col-12">
        <FormField
          name="data_validade_desconto"
          type="date"
          label={t('form.discountValidity')}
          size="md"
          value={formData.data_validade_desconto}
          onChange={(value) => handleInputChange('data_validade_desconto', value as string)}
        />
      </div>

      <div className="col-12">
        <AtivoInativoField
          value={!!formData.isento_mensalidade}
          onChange={(v) => handleInputChange('isento_mensalidade', v)}
          label={t('form.exemptFromMonthlyFee')}
          name="isento_mensalidade"
        />
      </div>

      <div className="col-12">
        <EntitySelectField
          value={formData.modelo_documento_id || modeloContratoSelecionado?.id || 0}
          onChange={(value) => {
            if (!value) {
              handleInputChange('modelo_documento_id', 0);
              return;
            }
            handleInputChange('modelo_documento_id', value);
            const modelo = (Array.isArray(modelosContratoData) ? modelosContratoData : modelosContratoData?.data || []).find((m) => m.id === value);
            if (modelo) {
              onModeloContratoSelect(modelo);
            }
          }}
          onShowModal={onShowModeloContratoModal}
          onEdit={() => modeloEdit.open(formData.modelo_documento_id || modeloContratoSelecionado?.id || 0)}
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
      </div>

      <div className="col-12">
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
      {planoEdit.modal}
      {bancoEdit.modal}
      {tipoCobrancaEdit.modal}
      {modeloEdit.modal}
      {clienteEdit.modal}
      {showClienteModal && (
        <ClienteListModal
          show
          onClose={() => setShowClienteModal(false)}
          title={t('ui.selectClient')}
          onSelectClient={(cliente) => {
            handleInputChange('cliente_id', cliente.id);
            setClienteNomeSelecionado(getClienteRazaoSocialLabel(cliente, ''));
            setShowClienteModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ContratoTab;
