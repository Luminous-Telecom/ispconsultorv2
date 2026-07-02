import React, { useState, useEffect } from 'react';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { TermoContrato } from 'services/termoContratoService';
import { Cliente } from 'types';
import { AssinaturaDigitalService, EnviarAssinaturaRequest } from 'services/assinaturaDigitalService';
import DraggableModal from 'components/common/DraggableModal';
import { CancelarButton, EnviarButton } from 'components/ui';
import FormField from 'components/ui/FormField';
import { useI18n } from 'contexts/I18nContext';
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
  const { t } = useI18n();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
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
      showApiError('Termo não selecionado');
      return;
    }

    if (!formData.email_assinante || !formData.nome_assinante) {
      showApiError('Email e nome do assinante são obrigatórios');
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
        showApiError(resultado.message || CONTEXT_ERROR_MESSAGES.DOCUMENT_SEND_SIGNATURE_ERROR);
        return;
      }
      
      success('Documento enviado para assinatura digital com sucesso!');
      
      queryClient.invalidateQueries({ queryKey: ['assinaturas-digital'] });
      queryClient.invalidateQueries({ queryKey: ['termos-contrato'] });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.DOCUMENT_SEND_SIGNATURE_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (field: keyof EnviarAssinaturaRequest, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const headerActions = (
    <div className="d-flex gap-2 modal-header-actions">
      <CancelarButton type="button" onClick={onClose} isPending={isSubmitting} />
      <EnviarButton
        type="submit"
        form="enviar-assinatura-form"
        isPending={isSubmitting}
        disabled={isSubmitting}
      />
    </div>
  );

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Assinatura Digital"
      size="lg"
      headerActions={headerActions}
    >
      <form id="enviar-assinatura-form" onSubmit={handleSubmit} className="form-modal-simple" autoComplete="off" data-form-type="other">
        <div className="row g-2">
          <div className="col-12">
            <FormField
              name="termo_readonly"
              type="text"
              label="Termo"
              value={termo ? `Termo #${termo.id} - ${termo.modeloDocumento?.nome || 'Sem nome'}` : ''}
              onChange={() => {}}
              readOnly
            />
          </div>

          <div className="col-12">
            <FormField
              name="email_assinante"
              type="email"
              label="Email do Assinante"
              value={formData.email_assinante}
              onChange={(value) => handleFieldChange('email_assinante', String(value ?? ''))}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="col-12">
            <FormField
              name="nome_assinante"
              type="text"
              label="Nome do Assinante"
              value={formData.nome_assinante}
              onChange={(value) => handleFieldChange('nome_assinante', String(value ?? ''))}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="col-12">
            <FormField
              name="cpf_cnpj_assinante"
              type="text"
              label="CPF/CNPJ do Assinante"
              value={formData.cpf_cnpj_assinante}
              onChange={(value) => handleFieldChange('cpf_cnpj_assinante', String(value ?? ''))}
              placeholder="11 dígitos para CPF ou 14 dígitos para CNPJ"
              disabled={isSubmitting}
            />
          </div>

          <div className="col-12">
            <FormField
              name="mensagem"
              type="textarea"
              label="Mensagem"
              value={formData.mensagem}
              onChange={(value) => handleFieldChange('mensagem', String(value ?? ''))}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="col-12">
            <FormField
              name="dias_expiracao"
              type="number"
              label={t('digitalSignature.expirationDays')}
              helpText={t('contract.signatureExpirationDaysHelp')}
              value={formData.dias_expiracao}
              onChange={(value) => handleFieldChange('dias_expiracao', parseInt(String(value ?? '30'), 10) || 30)}
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
