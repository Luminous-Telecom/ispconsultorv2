import React, { useState, useEffect } from 'react';
import { useContaPagar, useCreateContaPagar, useUpdateContaPagar, usePagarContaPagar } from 'hooks/useContasPagar';
import { useFornecedores } from 'hooks/useFornecedores';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useEntitySelectField } from 'hooks/useEntitySelectField';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, ConfirmarPagamentoButton, ModalFormActions, Spinner } from 'components/ui';
import FormField from 'components/ui/FormField';
import EntitySelectField from 'components/ui/EntitySelectField';
import FornecedorListModal from 'components/modals/fornecedores/FornecedorListModal';
import { CreateContaPagar } from 'types';
import { formatCurrency, formatCPF, formatCNPJ, formatLinhaDigitavel } from 'utils/formatters';
import { getTodayISO } from 'utils/dateUtils';

interface ContaPagarModalProps {
  show: boolean;
  onClose: () => void;
  contaPagarId?: number | null;
  onSuccess?: () => void;
  showPagamentoOnOpen?: boolean;
}

interface ContaPagarFormData {
  tipo_criacao: 'unica' | 'lote';
  fornecedor_id: number;
  data_vencimento: string;
  data_vencimento_inicial: string;
  data_vencimento_final: string;
  valor: string;
  tipo_pagamento: 'DINHEIRO' | 'BOLETO' | 'CARTAO' | 'DEPOSITO' | 'DEBITO_CONTA' | 'TRANSFERENCIA' | 'PIX';
  numero_documento: string;
  nota_fiscal: string;
  descricao: string;
  observacoes: string;
  linha_digitavel: string;
  tipo_chave_pix: 'CPF_CNPJ' | 'CELULAR' | 'EMAIL' | 'ALEATORIA' | 'QRCODE' | '';
  chave_pix: string;
}

const initialFormData: ContaPagarFormData = {
  tipo_criacao: 'unica',
  fornecedor_id: 0,
  data_vencimento: '',
  data_vencimento_inicial: '',
  data_vencimento_final: '',
  valor: '',
  tipo_pagamento: 'PIX',
  numero_documento: '',
  nota_fiscal: '',
  descricao: '',
  observacoes: '',
  linha_digitavel: '',
  tipo_chave_pix: '',
  chave_pix: ''
};

const getInitialPagamentoData = () => ({
  tipo_pagamento: 'PIX' as const,
  desconto_percentual: '',
  desconto_valor: '',
  acrescimo_percentual: '',
  acrescimo_valor: '',
  data_pagamento: getTodayISO(),
  observacao: '',
  valor_total: ''
});

const ContaPagarModal: React.FC<ContaPagarModalProps> = ({ 
  show, 
  onClose, 
  contaPagarId = null,
  onSuccess,
  showPagamentoOnOpen = false
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [formData, setFormData] = useState<ContaPagarFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof ContaPagarFormData, string>>>({});

  const isEditing = !!contaPagarId;
  const { data: contaPagar, isLoading: isLoadingContaPagar, refetch: refetchContaPagar } = useContaPagar(contaPagarId);
  const createMutation = useCreateContaPagar();
  const updateMutation = useUpdateContaPagar();
  const pagarMutation = usePagarContaPagar();

  const fornecedorSelect = useEntitySelectField<{ id: number; nome_razao_social: string }>();
  const { data: fornecedoresData } = useFornecedores({ limit: 100 });

  const [showPagamentoModal, setShowPagamentoModal] = useState(false);

  const [pagamentoData, setPagamentoData] = useState(getInitialPagamentoData);

  useEffect(() => {
    if (!show) {
      setFormData(initialFormData);
      setErrors({});
      fornecedorSelect.setSelectedId(0);
      setShowPagamentoModal(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  useEffect(() => {
    if (show && showPagamentoOnOpen && contaPagarId && contaPagar) {
      setShowPagamentoModal(true);
    }
  }, [show, showPagamentoOnOpen, contaPagarId, contaPagar]);

  useEffect(() => {
    if (!show) return;
    
    if (isEditing && contaPagar) {
      setFormData({
        tipo_criacao: 'unica',
        fornecedor_id: contaPagar.fornecedor_id,
        data_vencimento: contaPagar.data_vencimento ? contaPagar.data_vencimento.split('T')[0] : '',
        data_vencimento_inicial: '',
        data_vencimento_final: '',
        valor: contaPagar.valor ? formatCurrency(Number(contaPagar.valor), false) : '',
        tipo_pagamento: contaPagar.tipo_pagamento || 'PIX',
        numero_documento: contaPagar.numero_documento || '',
        nota_fiscal: contaPagar.nota_fiscal || '',
        descricao: contaPagar.descricao || '',
        observacoes: contaPagar.observacoes || '',
        linha_digitavel: contaPagar.linha_digitavel ? formatLinhaDigitavel(contaPagar.linha_digitavel) : '',
        tipo_chave_pix: contaPagar.tipo_chave_pix || '',
        chave_pix: contaPagar.chave_pix ? (() => {
          if (contaPagar.tipo_chave_pix === 'CPF_CNPJ') {
            const cleaned = contaPagar.chave_pix.replace(/\D/g, '');
            return cleaned.length <= 11 ? formatCPF(cleaned) : formatCNPJ(cleaned);
          }
          if (contaPagar.tipo_chave_pix === 'CELULAR') {
            const cleaned = contaPagar.chave_pix.replace(/\D/g, '').slice(0, 11);
            return cleaned && cleaned.length >= 10 ? `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}` : contaPagar.chave_pix;
          }
          return contaPagar.chave_pix;
        })() : ''
      });
      fornecedorSelect.setSelectedId(contaPagar.fornecedor_id);
    } else if (!isEditing) {
      setFormData(initialFormData);
      fornecedorSelect.setSelectedId(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, contaPagar, isEditing]);


  const valorAberto = contaPagar ? Number(contaPagar.valor) - Number(contaPagar.valor_pago || 0) : 0;
  const descontoPercentual = pagamentoData.desconto_percentual ? parseFloat(pagamentoData.desconto_percentual.replace(',', '.')) || 0 : 0;
  const descontoValor = pagamentoData.desconto_valor ? parseFloat(pagamentoData.desconto_valor.replace(/\./g, '').replace(',', '.')) || 0 : 0;
  const descontoTotal = descontoValor + (valorAberto * descontoPercentual / 100);
  const acrescimoPercentual = pagamentoData.acrescimo_percentual ? parseFloat(pagamentoData.acrescimo_percentual.replace(',', '.')) || 0 : 0;
  const acrescimoValor = pagamentoData.acrescimo_valor ? parseFloat(pagamentoData.acrescimo_valor.replace(/\./g, '').replace(',', '.')) || 0 : 0;
  const acrescimoTotal = acrescimoValor + (valorAberto * acrescimoPercentual / 100);
  const valorTotalCalculado = Math.max(0, valorAberto - descontoTotal + acrescimoTotal);
  
  const valorTotalDigitado = pagamentoData.valor_total?.trim() 
    ? parseFloat(pagamentoData.valor_total.replace(/\./g, '').replace(',', '.')) || null
    : null;
  const valorTotal = valorTotalDigitado ?? valorTotalCalculado;

  // Inicializar valor_total quando o modal abrir
  useEffect(() => {
    if (showPagamentoModal && contaPagar && !pagamentoData.valor_total) {
      setPagamentoData(prev => ({
        ...prev,
        valor_total: formatCurrency(valorTotalCalculado, false)
      }));
    }
  }, [showPagamentoModal, contaPagar, valorTotalCalculado, pagamentoData.valor_total]);

  const handlePagarManual = async () => {
    if (!contaPagarId || !contaPagar || valorTotal <= 0) {
      return;
    }

    try {
      await pagarMutation.mutateAsync({
        id: contaPagarId,
        data: {
          data: pagamentoData.data_pagamento,
          valor: valorTotal,
          tipo_pagamento: pagamentoData.tipo_pagamento,
          observacao: pagamentoData.observacao || undefined
        }
      });
      
      setPagamentoData(getInitialPagamentoData());
      if (contaPagarId) {
        await refetchContaPagar();
      }
      onSuccess?.();
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ContaPagarFormData, string>> = {};

    if (!formData.fornecedor_id || formData.fornecedor_id === 0) {
      newErrors.fornecedor_id = 'Fornecedor é obrigatório';
    }

    if (formData.tipo_criacao === 'unica') {
      if (!formData.data_vencimento.trim()) {
        newErrors.data_vencimento = 'Data de vencimento é obrigatória';
      }
    } else {
      if (!formData.data_vencimento_inicial.trim()) {
        newErrors.data_vencimento_inicial = 'Data inicial é obrigatória';
      }
      if (!formData.data_vencimento_final.trim()) {
        newErrors.data_vencimento_final = 'Data final é obrigatória';
      } else if (formData.data_vencimento_inicial.trim() && formData.data_vencimento_inicial > formData.data_vencimento_final) {
        newErrors.data_vencimento_final = 'Data final deve ser posterior à data inicial';
      }
    }

    if (!formData.valor.trim()) {
      newErrors.valor = 'Valor é obrigatório';
    } else {
      const valorNum = parseFloat(formData.valor.replace(/\./g, '').replace(',', '.'));
      if (isNaN(valorNum) || valorNum <= 0) {
        newErrors.valor = 'Valor deve ser maior que zero';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const valorNum = parseFloat(formData.valor.replace(/\./g, '').replace(',', '.'));
    
    const processarChavePix = () => {
      if (formData.tipo_pagamento !== 'PIX') return undefined;
      const chave = formData.chave_pix.trim();
      if (!chave) return undefined;
      if (formData.tipo_chave_pix === 'CPF_CNPJ' || formData.tipo_chave_pix === 'CELULAR') {
        return chave.replace(/\D/g, '');
      }
      return chave;
    };

    const submitData = {
      fornecedor_id: formData.fornecedor_id,
      valor: valorNum,
      tipo_pagamento: formData.tipo_pagamento,
      numero_documento: formData.numero_documento.trim() || undefined,
      nota_fiscal: formData.nota_fiscal.trim() || undefined,
      descricao: formData.descricao.trim() || undefined,
      observacoes: formData.observacoes.trim() || undefined,
      linha_digitavel: formData.tipo_pagamento === 'BOLETO' ? (formData.linha_digitavel.replace(/\D/g, '').trim() || undefined) : undefined,
      tipo_chave_pix: formData.tipo_pagamento === 'PIX' ? (formData.tipo_chave_pix || undefined) : undefined,
      chave_pix: processarChavePix(),
      ...(formData.tipo_criacao === 'lote' 
        ? { data_vencimento_inicial: formData.data_vencimento_inicial, data_vencimento_final: formData.data_vencimento_final }
        : { data_vencimento: formData.data_vencimento })
    } as CreateContaPagar & { data_vencimento_inicial?: string; data_vencimento_final?: string };

    try {
      if (isEditing && contaPagarId) {
        await updateMutation.mutateAsync({ id: contaPagarId, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      onSuccess?.();
    } catch (error) {
    }
  };

  const modalTitle = isEditing ? t('modal.editAccountPayable') : t('modal.createAccountPayable');

  const renderContent = () => {
    if (isLoadingContaPagar && isEditing) {
      return (
        <div className="text-center p-4">
          <Spinner size="md" variant="primary" aria-label={t('messages.loading')} />
          <p className="mt-2">{t('messages.loadingAccountData')}</p>
        </div>
      );
    }

    return (
      <form id={isEditing ? 'conta-pagar-edit-form' : 'conta-pagar-create-form'} onSubmit={handleSubmit} style={{ padding: isMobile ? '0' : '16px' }}>
        <div className="d-flex flex-column gap-2">
          <EntitySelectField
            value={formData.fornecedor_id}
            onChange={(value) => {
              fornecedorSelect.setSelectedId(value);
              setFormData(prev => ({ ...prev, fornecedor_id: value }));
              setErrors(prev => ({ ...prev, fornecedor_id: undefined }));
            }}
            onShowModal={fornecedorSelect.openModal}
            entities={(fornecedoresData?.data || []).map((f) => ({
              id: f.id,
              nome: f.nome_razao_social
            }))}
            label={t('form.supplier')}
            idFieldTitle={t('placeholder.enterSupplierId')}
            required
            error={errors.fornecedor_id}
          />

          {!isEditing && (
            <FormField
              name="tipo_criacao"
              type="select"
              label={t('form.creationType')}
              value={formData.tipo_criacao}
              onChange={(value) => {
                setFormData(prev => ({
                  ...prev,
                  tipo_criacao: value as 'unica' | 'lote',
                  data_vencimento: value === 'lote' ? '' : prev.data_vencimento,
                  data_vencimento_inicial: value === 'unica' ? '' : prev.data_vencimento_inicial,
                  data_vencimento_final: value === 'unica' ? '' : prev.data_vencimento_final
                }));
              }}
              options={[
                { value: 'unica', label: t('form.creationTypeUnique') },
                { value: 'lote', label: t('form.creationTypeBatch') }
              ]}
              size="sm"
            />
          )}

          {formData.tipo_criacao === 'unica' || isEditing ? (
            <FormField
              name="data_vencimento"
              type="date"
              label={t('form.dueDate')}
              value={formData.data_vencimento}
              onChange={(value) => {
                setFormData(prev => ({ ...prev, data_vencimento: String(value || '') }));
                setErrors(prev => ({ ...prev, data_vencimento: undefined }));
              }}
              required
              size="sm"
              error={errors.data_vencimento}
            />
          ) : (
            <div className="d-flex gap-2">
              <div className="flex-fill">
                <FormField
                  name="data_vencimento_inicial"
                  type="date"
                  label={t('form.dueDateInitial')}
                  value={formData.data_vencimento_inicial}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, data_vencimento_inicial: String(value || '') }));
                    setErrors(prev => ({ ...prev, data_vencimento_inicial: undefined }));
                  }}
                  required
                  size="sm"
                  error={errors.data_vencimento_inicial}
                />
              </div>
              <div className="flex-fill">
                <FormField
                  name="data_vencimento_final"
                  type="date"
                  label={t('form.dueDateFinal')}
                  value={formData.data_vencimento_final}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, data_vencimento_final: String(value || '') }));
                    setErrors(prev => ({ ...prev, data_vencimento_final: undefined }));
                  }}
                  required
                  size="sm"
                  error={errors.data_vencimento_final}
                />
              </div>
            </div>
          )}

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <FormField
                name="valor"
                type="text"
                label={t('form.value')}
                value={formData.valor}
                onChange={(value) => {
                  const cleaned = String(value || '').replace(/\D/g, '');
                  if (cleaned === '') {
                    setFormData(prev => ({ ...prev, valor: '' }));
                    return;
                  }
                  const num = parseInt(cleaned, 10) / 100;
                  const formatted = formatCurrency(num, false);
                  setFormData(prev => ({ ...prev, valor: formatted }));
                  setErrors(prev => ({ ...prev, valor: undefined }));
                }}
                placeholder="0,00"
                required
                size="sm"
                error={errors.valor}
              />
            </div>
            <div className="flex-fill">
              <FormField
                name="tipo_pagamento"
                type="select"
                label={t('form.paymentType')}
                value={formData.tipo_pagamento}
                onChange={(value) => {
                  setFormData(prev => ({
                    ...prev,
                    tipo_pagamento: value as ContaPagarFormData['tipo_pagamento'],
                    linha_digitavel: value !== 'BOLETO' ? '' : prev.linha_digitavel,
                    tipo_chave_pix: value !== 'PIX' ? '' : prev.tipo_chave_pix,
                    chave_pix: value !== 'PIX' ? '' : prev.chave_pix
                  }));
                }}
                options={[
                  { value: 'PIX', label: t('form.paymentTypePix') },
                  { value: 'DINHEIRO', label: t('form.paymentTypeCash') },
                  { value: 'BOLETO', label: t('form.paymentTypeBoleto') },
                  { value: 'CARTAO', label: t('form.paymentTypeCard') },
                  { value: 'DEPOSITO', label: t('form.paymentTypeDeposit') },
                  { value: 'DEBITO_CONTA', label: t('form.paymentTypeDebit') },
                  { value: 'TRANSFERENCIA', label: t('form.paymentTypeTransfer') }
                ]}
                size="sm"
              />
            </div>
          </div>

          {formData.tipo_pagamento === 'BOLETO' && (
            <FormField
              name="linha_digitavel"
              type="text"
              label={t('form.barcodeLine')}
              value={formData.linha_digitavel}
              onChange={(value) => {
                const cleaned = String(value || '').replace(/\D/g, '');
                const limited = cleaned.slice(0, 47);
                const formatted = formatLinhaDigitavel(limited);
                setFormData(prev => ({ ...prev, linha_digitavel: formatted }));
              }}
              placeholder="00000.00000 00000.000000 00000.000000 0 00000000000000"
              size="sm"
            />
          )}

          {formData.tipo_pagamento === 'PIX' && (
            <div className="d-flex gap-2">
              <div className="flex-fill">
                <FormField
                  name="tipo_chave_pix"
                  type="select"
                  label={t('form.pixKeyType')}
                  value={formData.tipo_chave_pix}
                  onChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      tipo_chave_pix: value as ContaPagarFormData['tipo_chave_pix'],
                      chave_pix: ''
                    }));
                  }}
                  options={[
                    { value: 'CPF_CNPJ', label: 'CPF/CNPJ' },
                    { value: 'CELULAR', label: t('form.phone') },
                    { value: 'EMAIL', label: t('form.email') },
                    { value: 'ALEATORIA', label: 'Aleatória' },
                    { value: 'QRCODE', label: t('form.qrCodeCopiaECola') }
                  ]}
                  size="sm"
                />
              </div>
              <div className="flex-fill">
                <FormField
                  name="chave_pix"
                  type="text"
                  label={formData.tipo_chave_pix === 'QRCODE' ? t('form.qrCodeCopiaECola') : t('form.pixKey')}
                  value={formData.chave_pix}
                  onChange={(value) => {
                    const inputValue = String(value || '');
                    let formatted = inputValue;

                    if (formData.tipo_chave_pix === 'CPF_CNPJ') {
                      const cleaned = inputValue.replace(/\D/g, '');
                      formatted = cleaned.length <= 11 ? formatCPF(cleaned) : formatCNPJ(cleaned);
                    } else if (formData.tipo_chave_pix === 'CELULAR') {
                      const cleaned = inputValue.replace(/\D/g, '').slice(0, 11);
                      formatted = cleaned && cleaned.length >= 10 ? `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}` : inputValue;
                    } else if (formData.tipo_chave_pix === 'EMAIL') {
                      formatted = inputValue.toLowerCase().trim();
                    }

                    setFormData(prev => ({ ...prev, chave_pix: formatted }));
                  }}
                  placeholder={
                    formData.tipo_chave_pix === 'CPF_CNPJ' ? t('placeholder.enterCpfCnpj') :
                    formData.tipo_chave_pix === 'CELULAR' ? t('placeholder.enterCellPhone') :
                    formData.tipo_chave_pix === 'EMAIL' ? t('placeholder.enterEmail') :
                    formData.tipo_chave_pix === 'ALEATORIA' ? t('placeholder.enterRandomKey') :
                    formData.tipo_chave_pix === 'QRCODE' ? t('placeholder.pasteQrCode') :
                    t('placeholder.enterPixKey')
                  }
                  size="sm"
                />
              </div>
            </div>
          )}

          <div className="d-flex gap-2">
            <div className="flex-fill">
              <FormField
                name="numero_documento"
                type="text"
                label={t('table.documentNumber')}
                value={formData.numero_documento}
                onChange={(value) => {
                  setFormData(prev => ({ ...prev, numero_documento: String(value || '') }));
                }}
                placeholder={t('table.documentNumber')}
                size="sm"
              />
            </div>
            <div className="flex-fill">
              <FormField
                name="nota_fiscal"
                type="text"
                label={t('form.invoiceNumber')}
                value={formData.nota_fiscal}
                onChange={(value) => {
                  setFormData(prev => ({ ...prev, nota_fiscal: String(value || '') }));
                }}
                placeholder={t('form.invoiceNumber')}
                size="sm"
              />
            </div>
          </div>

          <FormField
            name="descricao"
            type="textarea"
            label={t('table.description')}
            value={formData.descricao}
            onChange={(value) => {
              setFormData(prev => ({ ...prev, descricao: String(value || '') }));
            }}
            placeholder={t('table.description')}
            rows={3}
            size="sm"
          />

          <FormField
            name="observacoes"
            type="textarea"
            label={t('table.observations')}
            value={formData.observacoes}
            onChange={(value) => {
              setFormData(prev => ({ ...prev, observacoes: String(value || '') }));
            }}
            placeholder={t('table.observations')}
            rows={4}
            size="sm"
          />
        </div>
      </form>
    );
  };

  return (
    <>
      {/* Não renderizar o modal de edição se for apenas para pagamento */}
      {!showPagamentoOnOpen && (
        <DraggableModal
          show={show}
          onClose={onClose}
          title={modalTitle}
          size="lg"
          modalId={isEditing ? 'conta-pagar-edit-modal' : 'conta-pagar-create-modal'}
          headerActions={
            !(isLoadingContaPagar && isEditing) ? (
              <ModalFormActions
                onCancel={onClose}
                formId={isEditing ? 'conta-pagar-edit-form' : 'conta-pagar-create-form'}
                isPending={createMutation.isPending || updateMutation.isPending || pagarMutation.isPending}
              />
            ) : undefined
          }
        >
          {renderContent()}
        </DraggableModal>
      )}

      <FornecedorListModal
        show={fornecedorSelect.showModal}
        onClose={fornecedorSelect.closeModal}
        onSelectFornecedor={(fornecedor) => {
          fornecedorSelect.setSelectedId(fornecedor.id);
          setFormData(prev => ({ ...prev, fornecedor_id: fornecedor.id }));
          setErrors(prev => ({ ...prev, fornecedor_id: undefined }));
          fornecedorSelect.closeModal();
        }}
      />

      {showPagamentoModal && contaPagar && (
        <DraggableModal
          show={showPagamentoModal}
          onClose={() => {
            setShowPagamentoModal(false);
            setPagamentoData(getInitialPagamentoData());
          }}
            title={t('modal.payAccountManually')}
            size="lg"
            modalId="conta-pagar-pagamento-modal"
          headerActions={
            <div className="d-flex gap-2 modal-header-actions">
              <CancelarButton
                type="button"
                onClick={() => {
                  setShowPagamentoModal(false);
                  setPagamentoData(getInitialPagamentoData());
                }}
                isPending={pagarMutation.isPending}
              />
              <ConfirmarPagamentoButton
                type="button"
                onClick={handlePagarManual}
                isPending={pagarMutation.isPending}
                disabled={valorTotal <= 0}
              />
            </div>
          }
        >
          <div style={{ padding: isMobile ? '0' : '16px' }}>
            <div className="row">
              <div className="col-md-6 mb-1">
                <FormField
                  name="data_pagamento"
                  type="date"
                  label={t('table.paymentDate')}
                  value={pagamentoData.data_pagamento}
                  onChange={(value) => {
                    setPagamentoData(prev => ({ ...prev, data_pagamento: String(value || '') }));
                  }}
                  required
                  size="sm"
                />
              </div>

              <div className="col-md-6 mb-1">
                <FormField
                  name="tipo_pagamento_pagamento"
                  type="select"
                  label={t('form.paymentType')}
                  value={pagamentoData.tipo_pagamento}
                  onChange={(value) => {
                    setPagamentoData(prev => ({ ...prev, tipo_pagamento: value as typeof pagamentoData.tipo_pagamento }));
                  }}
                  options={[
                    { value: 'PIX', label: t('form.paymentTypePix') },
                    { value: 'DINHEIRO', label: t('form.paymentTypeCash') },
                    { value: 'BOLETO', label: t('form.paymentTypeBoleto') },
                    { value: 'CARTAO', label: t('form.paymentTypeCard') },
                    { value: 'DEPOSITO', label: t('form.paymentTypeDeposit') },
                    { value: 'DEBITO_CONTA', label: t('form.paymentTypeDebit') },
                    { value: 'TRANSFERENCIA', label: t('form.paymentTypeTransfer') }
                  ]}
                  required
                  size="sm"
                />
              </div>

              <div className="col-md-12 mb-1">
                <FormField
                  name="valor_aberto"
                  type="text"
                  label={t('table.openValue')}
                  value={formatCurrency(valorAberto, false)}
                  onChange={() => {}}
                  disabled
                  size="sm"
                />
              </div>

              <div className="col-md-6 mb-1">
                <FormField
                  name="desconto_percentual"
                  type="text"
                  label={t('form.discountPercentShort')}
                  value={pagamentoData.desconto_percentual}
                  onChange={(value) => {
                    const cleaned = String(value || '').replace(/[^\d,.]/g, '');
                    setPagamentoData(prev => ({ ...prev, desconto_percentual: cleaned }));
                  }}
                  placeholder="0,00"
                  size="sm"
                />
              </div>

              <div className="col-md-6 mb-1">
                <FormField
                  name="desconto_valor"
                  type="text"
                  label={t('form.discountValueShort')}
                  value={pagamentoData.desconto_valor}
                  onChange={(value) => {
                    const cleaned = String(value || '').replace(/\D/g, '');
                    if (cleaned === '') {
                      setPagamentoData(prev => ({ ...prev, desconto_valor: '' }));
                      return;
                    }
                    const num = parseInt(cleaned, 10) / 100;
                    const formatted = formatCurrency(num, false);
                    setPagamentoData(prev => ({ ...prev, desconto_valor: formatted }));
                  }}
                  placeholder="0,00"
                  size="sm"
                />
              </div>

              <div className="col-md-6 mb-1">
                <FormField
                  name="acrescimo_percentual"
                  type="text"
                  label={t('form.increasePercentShort')}
                  value={pagamentoData.acrescimo_percentual}
                  onChange={(value) => {
                    const cleaned = String(value || '').replace(/[^\d,.]/g, '');
                    setPagamentoData(prev => ({ ...prev, acrescimo_percentual: cleaned }));
                  }}
                  placeholder="0,00"
                  size="sm"
                />
              </div>

              <div className="col-md-6 mb-1">
                <FormField
                  name="acrescimo_valor"
                  type="text"
                  label={t('form.increaseValueShort')}
                  value={pagamentoData.acrescimo_valor}
                  onChange={(value) => {
                    const cleaned = String(value || '').replace(/\D/g, '');
                    if (cleaned === '') {
                      setPagamentoData(prev => ({ ...prev, acrescimo_valor: '' }));
                      return;
                    }
                    const num = parseInt(cleaned, 10) / 100;
                    const formatted = formatCurrency(num, false);
                    setPagamentoData(prev => ({ ...prev, acrescimo_valor: formatted }));
                  }}
                  placeholder="0,00"
                  size="sm"
                />
              </div>

              <div className="col-md-6 mb-1">
                <FormField
                  name="valor_baixado"
                  type="text"
                  label={t('form.baixadoValue')}
                  value={formatCurrency(valorTotal, false)}
                  onChange={() => {}}
                  disabled
                  size="sm"
                />
              </div>

              <div className="col-md-6 mb-1">
                <FormField
                  name="valor_total"
                  type="text"
                  label={t('form.totalToPay')}
                  value={pagamentoData.valor_total !== undefined ? pagamentoData.valor_total : formatCurrency(valorTotalCalculado, false)}
                  onChange={(value) => {
                    const inputValue = String(value || '');
                    const cleaned = inputValue.replace(/\D/g, '');
                    if (cleaned === '') {
                      setPagamentoData(prev => ({ 
                        ...prev, 
                        valor_total: ''
                      }));
                      return;
                    }
                    const num = parseInt(cleaned, 10) / 100;
                    const formatted = formatCurrency(num, false);
                    setPagamentoData(prev => ({ 
                      ...prev, 
                      valor_total: formatted
                    }));
                  }}
                  size="sm"
                />
              </div>

              <div className="col-md-12 mb-1">
                <FormField
                  name="observacao_pagamento"
                  type="textarea"
                  label={t('table.observations')}
                  value={pagamentoData.observacao}
                  onChange={(value) => {
                    setPagamentoData(prev => ({ ...prev, observacao: String(value || '') }));
                  }}
                  placeholder={t('table.observations')}
                  rows={3}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </DraggableModal>
      )}
    </>
  );
};

export default ContaPagarModal;

