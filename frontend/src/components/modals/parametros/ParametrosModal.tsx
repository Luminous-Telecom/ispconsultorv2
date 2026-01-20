import React, { useState, useMemo } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { ParametrosService } from '@/services/parametrosService';
import { useFormReset } from '@/hooks/useFormReset';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
interface ParametrosModalProps {
  show: boolean;
  onClose: () => void;
}

interface ParametrosForm {
  validar_cpf_cnpj: boolean;
  validar_cep: boolean;
  titulos_vence_sabado: boolean;
  titulos_vence_domingo: boolean;
  auto_lancamento_titulos: boolean;
  total_titulos_financeiro: number;
  central_assinante_metodo_login: string;
}

const ParametrosModal: React.FC<ParametrosModalProps> = ({ show, onClose }) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();

  // Dados iniciais do formulário
  const initialFormData: ParametrosForm = {
    validar_cpf_cnpj: true,
    validar_cep: false,
    titulos_vence_sabado: false,
    titulos_vence_domingo: false,
    auto_lancamento_titulos: false,
    total_titulos_financeiro: 12,
    central_assinante_metodo_login: 'cnpj'
  };

  const [formData, setFormData] = useState<ParametrosForm>(initialFormData);

  const { data: parametros, isLoading } = useQuery({
    queryKey: ['parametros'],
    queryFn: () => ParametrosService.get(),
    staleTime: 60 * 1000, // 60 segundos
    refetchOnMount: false,
  });

  // Dados customizados dos parâmetros (quando editando)
  const customFormData = useMemo(() => {
    if (!parametros?.data) return undefined;
    
    return {
      validar_cpf_cnpj: parametros.data.validar_cpf_cnpj ?? true,
      validar_cep: parametros.data.validar_cep ?? false,
      titulos_vence_sabado: parametros.data.titulos_vence_sabado ?? false,
      titulos_vence_domingo: parametros.data.titulos_vence_domingo ?? false,
      auto_lancamento_titulos: parametros.data.auto_lancamento_titulos ?? false,
      total_titulos_financeiro: parametros.data.total_titulos_financeiro ?? 12,
      central_assinante_metodo_login: parametros.data.central_assinante_metodo_login ?? 'cnpj'
    };
  }, [parametros?.data]);

  // Usar hook personalizado para reset do formulário
  useFormReset({
    show,
    initialData: initialFormData,
    setFormData,
    customData: customFormData
  });

  const updateParametrosMutation = useMutation({
    mutationFn: (data: ParametrosForm) => ParametrosService.update(data),
    onSuccess: () => {
      success('Parâmetros atualizados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['parametros'] });
      // Não fecha o modal para permitir múltiplas edições
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError?.response?.data?.message || 'Erro ao atualizar parâmetros';
      showError(message);
    }
  });

  const handleCheckboxChange = (field: keyof ParametrosForm) => {
    setFormData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleNumberChange = (field: keyof ParametrosForm, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setFormData(prev => ({ ...prev, [field]: numValue }));
    }
  };

  const handleSelectChange = (field: keyof ParametrosForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParametrosMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (customFormData) {
      setFormData(customFormData);
    }
    onClose();
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('layout.parameters')}
      size="md"
      modalId="parametros-modal"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleCancel}
            disabled={updateParametrosMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="parametros-form"
            variant="primary"
            size="sm"
            isLoading={updateParametrosMutation.isPending}
          >
            Salvar
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="text-center p-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      ) : (
      <form id="parametros-form" onSubmit={handleSubmit} style={{ padding: isMobile ? '0' : '16px' }}>
        <div>
          <div className="card mb-3">
            <div className="card-header">
              <h6 className="mb-0">Validações</h6>
            </div>
            <div className="card-body">
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="validar_cpf_cnpj"
                  name="validar_cpf_cnpj"
                  checked={formData.validar_cpf_cnpj}
                  onChange={() => handleCheckboxChange('validar_cpf_cnpj')}
                  disabled={updateParametrosMutation.isPending}
                />
                <label className="form-check-label" htmlFor="validar_cpf_cnpj">
                  Validar CPF/CNPJ
                </label>
                <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                  Quando ativado, valida se CPF/CNPJ é válido ao cadastrar/editar clientes
                </div>
              </div>

              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="validar_cep"
                  name="validar_cep"
                  checked={formData.validar_cep}
                  onChange={() => handleCheckboxChange('validar_cep')}
                  disabled={updateParametrosMutation.isPending}
                />
                <label className="form-check-label" htmlFor="validar_cep">
                  Validar CEP
                </label>
                <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                  Quando ativado, busca automaticamente os dados do endereço ao digitar um CEP válido
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header">
              <h6 className="mb-0">Geração de Títulos</h6>
            </div>
            <div className="card-body">
              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="titulos_vence_sabado"
                  name="titulos_vence_sabado"
                  checked={formData.titulos_vence_sabado}
                  onChange={() => handleCheckboxChange('titulos_vence_sabado')}
                  disabled={updateParametrosMutation.isPending}
                />
                <label className="form-check-label" htmlFor="titulos_vence_sabado">
                  Títulos que Vencem aos Sábados
                </label>
                <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                  Se data de vencimento cair em sábado, mantém no sábado. Se desativado, move para próximo dia útil
                </div>
              </div>

              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="titulos_vence_domingo"
                  name="titulos_vence_domingo"
                  checked={formData.titulos_vence_domingo}
                  onChange={() => handleCheckboxChange('titulos_vence_domingo')}
                  disabled={updateParametrosMutation.isPending}
                />
                <label className="form-check-label" htmlFor="titulos_vence_domingo">
                  Títulos que Vencem aos Domingos
                </label>
                <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                  Se data de vencimento cair em domingo, mantém no domingo. Se desativado, move para próximo dia útil
                </div>
              </div>

              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="auto_lancamento_titulos"
                  name="auto_lancamento_titulos"
                  checked={formData.auto_lancamento_titulos}
                  onChange={() => handleCheckboxChange('auto_lancamento_titulos')}
                  disabled={updateParametrosMutation.isPending}
                />
                <label className="form-check-label" htmlFor="auto_lancamento_titulos">
                  Auto Lançamento de Títulos
                </label>
                <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                  Lança automaticamente novos títulos para manter o total configurado no financeiro
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="total_titulos_financeiro" className="form-label">
                  Total de Títulos no Financeiro
                </label>
                <input
                  type="number"
                  className="form-control"
                  id="total_titulos_financeiro"
                  name="total_titulos_financeiro"
                  min="1"
                  max="24"
                  value={formData.total_titulos_financeiro}
                  onChange={(e) => handleNumberChange('total_titulos_financeiro', e.target.value)}
                  disabled={updateParametrosMutation.isPending || !formData.auto_lancamento_titulos}
                />
                <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                  Quantidade de títulos futuros a manter sempre disponíveis no financeiro (de 1 a 24 meses)
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header">
              <h6 className="mb-0">Central do Assinante</h6>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <label htmlFor="central_assinante_metodo_login" className="form-label">
                  Método de Login
                </label>
                <select
                  className="form-select"
                  id="central_assinante_metodo_login"
                  name="central_assinante_metodo_login"
                  value={formData.central_assinante_metodo_login}
                  onChange={(e) => handleSelectChange('central_assinante_metodo_login', e.target.value)}
                  disabled={updateParametrosMutation.isPending}
                >
                  <option value="cnpj">CNPJ</option>
                  <option value="email">Email</option>
                </select>
                <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                  Define se o login na central do assinante será feito por CNPJ ou Email
                </div>
              </div>
            </div>
          </div>

        </div>

      </form>
      )}
    </DraggableModal>
  );
};

export default ParametrosModal;

