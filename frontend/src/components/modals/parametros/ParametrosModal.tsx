import React, { useState, useEffect } from 'react';
import DraggableModal from '../../common/DraggableModal';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import { ParametrosService } from '../../../services/parametrosService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface ParametrosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParametrosForm {
  validar_cpf_cnpj: boolean;
  gerar_titulos_automatico: boolean;
  titulos_vence_sabado: boolean;
  auto_lancamento_titulos: boolean;
  total_titulos_financeiro: number;
}

const ParametrosModal: React.FC<ParametrosModalProps> = ({ isOpen, onClose }) => {
  const { success, error: showError } = useNotificationContext();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ParametrosForm>({
    validar_cpf_cnpj: true,
    gerar_titulos_automatico: false,
    titulos_vence_sabado: false,
    auto_lancamento_titulos: false,
    total_titulos_financeiro: 12
  });

  const { data: parametros, isLoading } = useQuery({
    queryKey: ['parametros'],
    queryFn: () => ParametrosService.get(),
    enabled: isOpen
  });

  useEffect(() => {
    if (parametros?.data) {
      setFormData({
        validar_cpf_cnpj: parametros.data.validar_cpf_cnpj ?? true,
        gerar_titulos_automatico: parametros.data.gerar_titulos_automatico ?? false,
        titulos_vence_sabado: parametros.data.titulos_vence_sabado ?? false,
        auto_lancamento_titulos: parametros.data.auto_lancamento_titulos ?? false,
        total_titulos_financeiro: parametros.data.total_titulos_financeiro ?? 12
      });
    }
  }, [parametros]);

  const updateParametrosMutation = useMutation({
    mutationFn: (data: ParametrosForm) => ParametrosService.update(data),
    onSuccess: () => {
      success('Parâmetros atualizados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['parametros'] });
      onClose();
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message || 'Erro ao atualizar parâmetros';
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
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParametrosMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (parametros?.data) {
      setFormData({
        validar_cpf_cnpj: parametros.data.validar_cpf_cnpj ?? true,
        gerar_titulos_automatico: parametros.data.gerar_titulos_automatico ?? false,
        titulos_vence_sabado: parametros.data.titulos_vence_sabado ?? false,
        auto_lancamento_titulos: parametros.data.auto_lancamento_titulos ?? false,
        total_titulos_financeiro: parametros.data.total_titulos_financeiro ?? 12
      });
    }
    onClose();
  };

  if (isLoading) {
    return (
      <DraggableModal
        show={isOpen}
        onClose={onClose}
        title="Parâmetros do Sistema"
        size="md"
      >
        <div className="text-center p-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      </DraggableModal>
    );
  }

  return (
    <DraggableModal
      show={isOpen}
      onClose={onClose}
      title="Parâmetros do Sistema"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
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
                  checked={formData.validar_cpf_cnpj}
                  onChange={() => handleCheckboxChange('validar_cpf_cnpj')}
                  disabled={updateParametrosMutation.isPending}
                />
                <label className="form-check-label" htmlFor="validar_cpf_cnpj">
                  Validar CPF/CNPJ
                </label>
                <div className="text-muted">
                  Quando ativado, valida se CPF/CNPJ é válido ao cadastrar/editar clientes
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
                  id="gerar_titulos_automatico"
                  checked={formData.gerar_titulos_automatico}
                  onChange={() => handleCheckboxChange('gerar_titulos_automatico')}
                  disabled={updateParametrosMutation.isPending}
                />
                <label className="form-check-label" htmlFor="gerar_titulos_automatico">
                  Gerar Títulos Automaticamente
                </label>
                <div className="text-muted">
                  Gera títulos automaticamente ao criar/renovar contratos
                </div>
              </div>

              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="titulos_vence_sabado"
                  checked={formData.titulos_vence_sabado}
                  onChange={() => handleCheckboxChange('titulos_vence_sabado')}
                  disabled={updateParametrosMutation.isPending}
                />
                <label className="form-check-label" htmlFor="titulos_vence_sabado">
                  Títulos que Vencem aos Sábados
                </label>
                <div className="text-muted">
                  Se data de vencimento cair em sábado, mantém no sábado. Se desativado, move para próximo dia útil
                </div>
              </div>

              <div className="form-check mb-3">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="auto_lancamento_titulos"
                  checked={formData.auto_lancamento_titulos}
                  onChange={() => handleCheckboxChange('auto_lancamento_titulos')}
                  disabled={updateParametrosMutation.isPending}
                />
                <label className="form-check-label" htmlFor="auto_lancamento_titulos">
                  Auto Lançamento de Títulos
                </label>
                <div className="text-muted">
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
                  min="1"
                  max="24"
                  value={formData.total_titulos_financeiro}
                  onChange={(e) => handleNumberChange('total_titulos_financeiro', e.target.value)}
                  disabled={updateParametrosMutation.isPending || !formData.auto_lancamento_titulos}
                />
                <div className="text-muted">
                  Quantidade de títulos futuros a manter sempre disponíveis no financeiro (de 1 a 24 meses)
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={updateParametrosMutation.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={updateParametrosMutation.isPending}
          >
            Salvar
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default ParametrosModal;

