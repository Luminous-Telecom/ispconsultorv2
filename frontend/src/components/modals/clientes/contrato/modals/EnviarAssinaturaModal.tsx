import React, { useState, useEffect } from 'react';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { TermoContrato } from 'services/termoContratoService';
import { Cliente } from 'types';
import { AssinaturaDigitalService, EnviarAssinaturaRequest } from 'services/assinaturaDigitalService';
import DraggableModal from 'components/common/DraggableModal';
import { Button } from 'components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from 'hooks/useMediaQuery';

interface EnviarAssinaturaModalProps {
  show: boolean;
  onClose: () => void;
  termo: TermoContrato | null;
  cliente?: Cliente | null;
  onSuccess?: () => void;
}

const EnviarAssinaturaModal: React.FC<EnviarAssinaturaModalProps> = ({
  show,
  onClose,
  termo,
  cliente,
  onSuccess
}) => {
  const isMobile = useIsMobile();
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<EnviarAssinaturaRequest>({
    email_assinante: '',
    nome_assinante: '',
    cpf_cnpj_assinante: '',
    mensagem: 'Por favor, assine este documento',
    dias_expiracao: 30
  });

  useEffect(() => {
    if (show && cliente) {
      setFormData(prev => ({
        ...prev,
        email_assinante: cliente.email || '',
        nome_assinante: cliente.razao_social || cliente.nome_fantasia || '',
        cpf_cnpj_assinante: cliente.cnpj || ''
      }));
    } else if (!show) {
      setFormData({
        email_assinante: '',
        nome_assinante: '',
        cpf_cnpj_assinante: '',
        mensagem: 'Por favor, assine este documento',
        dias_expiracao: 30
      });
    }
  }, [show, cliente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!termo) {
      error('Termo não selecionado');
      return;
    }

    if (!formData.email_assinante || !formData.nome_assinante) {
      error('Email e nome do assinante são obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      const requestData: EnviarAssinaturaRequest = {
        termo_contrato_id: termo.id,
        cliente_id: cliente?.id,
        email_assinante: formData.email_assinante,
        nome_assinante: formData.nome_assinante,
        cpf_cnpj_assinante: formData.cpf_cnpj_assinante || undefined,
        mensagem: formData.mensagem || undefined,
        dias_expiracao: formData.dias_expiracao || 30
      };

      const resultado = await AssinaturaDigitalService.enviarParaAssinatura(requestData);
      
      if (!resultado.success) {
        error(resultado.message || 'Erro ao enviar documento para assinatura');
        return;
      }
      
      success('Documento enviado para assinatura digital com sucesso!');
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['assinaturas-digital'] });
      queryClient.invalidateQueries({ queryKey: ['termos-contrato'] });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar documento para assinatura';
      error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const headerActions = (
    <div className="d-flex gap-2 modal-header-actions">
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={onClose}
        disabled={isSubmitting}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form="enviar-assinatura-form"
        variant="primary"
        size="sm"
        disabled={isSubmitting}
        isLoading={isSubmitting}
      >
        Salvar
      </Button>
    </div>
  );

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Enviar para Assinatura Digital"
      size="lg"
      headerActions={headerActions}
    >
      <form id="enviar-assinatura-form" onSubmit={handleSubmit} style={{ padding: isMobile ? '0' : '16px' }} autoComplete="off" data-form-type="other">
        <div className="d-flex flex-column gap-2">
          <div>
            <label className="form-label">Termo</label>
            <input
              type="text"
              className="form-control"
              value={termo ? `Termo #${termo.id} - ${termo.modeloDocumento?.nome || 'Sem nome'}` : ''}
              disabled
            />
          </div>

          <div>
            <label className="form-label">
              Email do Assinante <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              name="email_assinante"
              className="form-control"
              value={formData.email_assinante}
              onChange={handleInputChange}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="form-label">
              Nome do Assinante <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              name="nome_assinante"
              className="form-control"
              value={formData.nome_assinante}
              onChange={handleInputChange}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="form-label">CPF/CNPJ do Assinante</label>
            <input
              type="text"
              name="cpf_cnpj_assinante"
              className="form-control"
              value={formData.cpf_cnpj_assinante}
              onChange={handleInputChange}
              placeholder="11 dígitos para CPF ou 14 dígitos para CNPJ"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="form-label">Mensagem</label>
            <textarea
              name="mensagem"
              className="form-control"
              rows={3}
              value={formData.mensagem}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="form-label">
              Dias para Expiração
              <i
                className="bi bi-info-circle text-muted ms-1"
                style={{ cursor: 'help', fontSize: '0.85rem' }}
                title="Padrão: 30 dias"
              />
            </label>
            <input
              type="number"
              name="dias_expiracao"
              className="form-control"
              value={formData.dias_expiracao}
              onChange={handleInputChange}
              min={1}
              max={365}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </form>
    </DraggableModal>
  );
};

export default EnviarAssinaturaModal;
