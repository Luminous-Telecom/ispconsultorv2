import React, { useState, useEffect } from 'react';
import { SchedulerService, CreateRotinaData } from '../../../services/schedulerService';
import DraggableModal from '../../common/DraggableModal';

interface RotinaFormProps {
  show: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  editData?: any; // Rotina para editar
}

const RotinaForm: React.FC<RotinaFormProps> = ({ show, onSuccess, onCancel, editData }) => {
  const [formData, setFormData] = useState<CreateRotinaData>({
    nome: '', // Será preenchido automaticamente baseado no tipo
    tipo: 'geracao_titulos',
    descricao: '',
    frequencia: 'diaria',
    hora_execucao: '10:00',
    configuracao: {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Inicializar dados do formulário
  useEffect(() => {
    if (editData) {
      // Modo edição - preencher com dados existentes
      setFormData({
        nome: editData.nome || '',
        tipo: editData.tipo || 'geracao_titulos',
        descricao: editData.descricao || '',
        frequencia: editData.frequencia || 'diaria',
        hora_execucao: editData.hora_execucao || '10:00',
        configuracao: editData.configuracao || {}
      });
    } else {
      // Modo criação - inicializar com valores padrão
      const nomesPorTipo: Record<string, string> = {
        'geracao_titulos': 'Geração de Títulos',
        'envio_boletos': 'Envio de Boletos',
        'remessa_bancaria': 'Remessa Bancária',
        'outros': 'Rotina Personalizada'
      };
      
      setFormData(prev => ({
        ...prev,
        nome: nomesPorTipo[prev.tipo] || 'Rotina Personalizada'
      }));
    }
  }, [editData]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Se mudou o tipo, atualizar o nome automaticamente
    if (name === 'tipo') {
      const nomesPorTipo: Record<string, string> = {
        'geracao_titulos': 'Geração de Títulos',
        'envio_boletos': 'Envio de Boletos',
        'remessa_bancaria': 'Remessa Bancária',
        'outros': 'Rotina Personalizada'
      };
      
      setFormData(prev => ({
        ...prev,
        tipo: value as 'geracao_titulos' | 'envio_boletos' | 'remessa_bancaria' | 'outros',
        nome: nomesPorTipo[value] || 'Rotina Personalizada'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Limpar erro quando usuário começar a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.hora_execucao) {
      newErrors.hora_execucao = 'Hora de execução é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editData) {
        // Modo edição
        console.log('📤 Enviando dados para atualização:', {
          id: editData.id,
          formData: formData
        });
        await SchedulerService.updateRotina(editData.id, formData);
      } else {
        // Modo criação
        console.log('📤 Enviando dados para criação:', formData);
        await SchedulerService.createRotina(formData);
      }
      onSuccess();
    } catch (error: any) {
      console.error(`Erro ao ${editData ? 'atualizar' : 'criar'} rotina:`, error);
      setErrors({ submit: error.response?.data?.message || error.message || `Erro ao ${editData ? 'atualizar' : 'criar'} rotina` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={onCancel}
      title={editData ? "Editar Rotina Agendada" : "Nova Rotina Agendada"}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        {errors.submit && (
          <div className="alert alert-danger">
            {errors.submit}
          </div>
        )}

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="tipo" className="form-label">Tipo de Rotina *</label>
              <select
                className="form-select"
                id="tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
              >
                <option value="geracao_titulos">Geração de Títulos</option>
                <option value="envio_boletos">Envio de Boletos</option>
                <option value="remessa_bancaria">Remessa Bancária</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          </div>

          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="frequencia" className="form-label">Frequência *</label>
              <select
                className="form-select"
                id="frequencia"
                name="frequencia"
                value={formData.frequencia}
                onChange={handleChange}
              >
                <option value="diaria">Diária</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
                <option value="anual">Anual</option>
                <option value="personalizada">Personalizada</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="descricao" className="form-label">Descrição</label>
          <textarea
            className="form-control"
            id="descricao"
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            rows={3}
            placeholder="Descreva o que esta rotina faz..."
          />
        </div>

        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label htmlFor="hora_execucao" className="form-label">Hora de Execução *</label>
              <input
                type="time"
                className={`form-control ${errors.hora_execucao ? 'is-invalid' : ''}`}
                id="hora_execucao"
                name="hora_execucao"
                value={formData.hora_execucao}
                onChange={handleChange}
              />
              {errors.hora_execucao && <div className="invalid-feedback">{errors.hora_execucao}</div>}
            </div>
          </div>
        </div>

        {/* Configurações específicas por tipo */}
        {formData.tipo === 'geracao_titulos' && (
          <div className="mb-3">
            <label className="form-label">Configurações para Geração de Títulos</label>
            <div className="form-text">
              Esta rotina irá gerar títulos automaticamente para clientes ativos.
              Configure os parâmetros específicos conforme necessário.
            </div>
          </div>
        )}

        {formData.tipo === 'envio_boletos' && (
          <div className="mb-3">
            <label className="form-label">Configurações para Envio de Boletos</label>
            <div className="form-text">
              Esta rotina irá enviar boletos por email para clientes com parcelas próximas do vencimento.
            </div>
          </div>
        )}

        {formData.tipo === 'remessa_bancaria' && (
          <div className="mb-3">
            <label className="form-label">Configurações para Remessa Bancária</label>
            <div className="form-text">
              Esta rotina irá gerar e enviar arquivos de remessa para os bancos configurados.
            </div>
          </div>
        )}

        {/* Botões do modal */}
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? (editData ? 'Atualizando...' : 'Criando...') : (editData ? 'Atualizar Rotina' : 'Criar Rotina')}
          </button>
        </div>
      </form>
    </DraggableModal>
  );
};

export default RotinaForm;
