import React, { useState, useMemo, useLayoutEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { ParametrosService } from '@/services/parametrosService';
import { useFormReset } from '@/hooks/useFormReset';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';

interface RecursosSistemaModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  onHeaderActionsReady?: (actions: React.ReactNode) => void;
}

interface ParametrosForm {
  validar_cpf_cnpj: boolean;
  validar_cep: boolean;
  titulos_vence_sabado: boolean;
  titulos_vence_domingo: boolean;
  central_assinante_metodo_login: string;
}

const RecursosSistemaModal: React.FC<RecursosSistemaModalProps> = ({ show, onClose, skipWrapper = false, onHeaderActionsReady }) => {
  const isMobile = useIsMobile();
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();

  // Dados iniciais do formulário
  const initialFormData: ParametrosForm = {
    validar_cpf_cnpj: true,
    validar_cep: false,
    titulos_vence_sabado: false,
    titulos_vence_domingo: false,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParametrosMutation.mutate(formData);
  };

  const handleCheckboxChange = (field: keyof ParametrosForm) => {
    setFormData(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSelectChange = (field: keyof ParametrosForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const headerActionsContent = useMemo(() => (
    <div className="d-flex gap-2 modal-header-actions">
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={onClose}
        disabled={updateParametrosMutation.isPending}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form="recursos-sistema-form"
        variant="primary"
        size="sm"
        isLoading={updateParametrosMutation.isPending}
      >
        Salvar
      </Button>
    </div>
  ), [onClose, updateParametrosMutation.isPending]);

  // Passar headerActions para o SingleModalWrapper quando skipWrapper for true.
  // useLayoutEffect garante que os botões apareçam antes da pintura, evitando flash.
  useLayoutEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      onHeaderActionsReady(headerActionsContent);
    }
  }, [skipWrapper, onHeaderActionsReady, headerActionsContent]);

  const modalContent = (
    <>
      {isLoading ? (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      ) : (
        <>
          <form id="recursos-sistema-form" onSubmit={handleSubmit} style={{ padding: isMobile ? '0' : '16px' }}>
            <div>
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

                </div>
              </div>

              <div className="card mb-3">
                <div className="card-header py-1 px-2">
                  <small className="fw-bold mb-0">Central do Assinante</small>
                </div>
                <div className="card-body p-2">
                  <div className="mb-2">
                    <label htmlFor="central_assinante_metodo_login" className="form-label small mb-1">
                      Método de Login
                    </label>
                    <select
                      className="form-select form-select-sm"
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
        </>
      )}
    </>
  );

  if (skipWrapper) {
    return modalContent;
  }

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Recursos do Sistema"
      size="md"
      modalId="recursos-sistema-modal"
      headerActions={headerActionsContent}
    >
      {modalContent}
    </DraggableModal>
  );
};

export default RecursosSistemaModal;
