import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { ParametrosService } from '@/services/parametrosService';
import { useFormReset } from '@/hooks/useFormReset';
import DraggableModal from '../../common/DraggableModal';

interface RecursosSistemaModalProps {
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
}

const RecursosSistemaModal: React.FC<RecursosSistemaModalProps> = ({ show, onClose }) => {
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();

  // Dados iniciais do formulário
  const initialFormData: ParametrosForm = {
    validar_cpf_cnpj: true,
    validar_cep: false,
    titulos_vence_sabado: false,
    titulos_vence_domingo: false,
    auto_lancamento_titulos: false,
    total_titulos_financeiro: 12
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
      total_titulos_financeiro: parametros.data.total_titulos_financeiro ?? 12
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
    mutationFn: (data: Partial<ParametrosForm>) => ParametrosService.update(data),
    onSuccess: () => {
      success('Parâmetros atualizados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['parametros'] });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message?: string }>;
      showError(axiosError?.response?.data?.message || 'Erro ao atualizar parâmetros');
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateParametrosMutation.mutateAsync(formData);
    } catch (error) {
      // Erro já tratado no mutation
    }
  };

  const handleCheckboxChange = (field: keyof ParametrosForm) => {
    setFormData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleNumberChange = (field: keyof ParametrosForm, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setFormData(prev => ({
        ...prev,
        [field]: numValue
      }));
    }
  };

  if (isLoading) {
    return (
      <DraggableModal
        show={show}
        onClose={onClose}
        title="Recursos do Sistema"
        size="md"
        modalId="recursos-sistema-modal"
      >
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </DraggableModal>
    );
  }

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Recursos do Sistema"
      size="md"
      modalId="recursos-sistema-modal"
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={updateParametrosMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="recursos-sistema-form"
            className="btn btn-primary btn-sm"
            disabled={updateParametrosMutation.isPending}
          >
            Salvar
          </button>
        </div>
      }
    >
      <form id="recursos-sistema-form" onSubmit={handleSubmit}>
        <div className="modal-body p-2">
          <div className="card mb-3">
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">Validações</small>
            </div>
            <div className="card-body p-2">
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
            <div className="card-header py-1 px-2">
              <small className="fw-bold mb-0">Geração de Títulos</small>
            </div>
            <div className="card-body p-2">
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
                  Títulos Vencem aos Sábados
                </label>
                <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                  Permite que títulos tenham vencimento aos sábados
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
                  Títulos Vencem aos Domingos
                </label>
                <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>
                  Permite que títulos tenham vencimento aos domingos
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

              <div className="mb-2">
                <label htmlFor="total_titulos_financeiro" className="form-label small mb-1">
                  Total de Títulos no Financeiro
                </label>
                <input
                  type="number"
                  className="form-control form-control-sm"
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
        </div>
      </form>
    </DraggableModal>
  );
};

export default RecursosSistemaModal;
