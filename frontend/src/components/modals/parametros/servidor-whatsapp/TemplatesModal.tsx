import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { FecharButton, RecarregarButton } from 'components/ui';
import TemplatesMetaTab from './abas/TemplatesMetaTab';

interface TemplatesModalProps {
  show: boolean;
  onClose: () => void;
  mensagemType?: string;
  onSalvarVincular?: (data: { template_id: number }) => Promise<void>;
}

const TemplatesModal: React.FC<TemplatesModalProps> = ({ show, onClose, mensagemType, onSalvarVincular }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const handleAtualizar = () => {
    queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={t('settings.messages.activeTemplatesWhatsApp')}
      size="xl"
      modalId="templates-modal"
      className="no-padding d-flex gap-2 modal-header-actions"
      headerActions={
        <div >
          <RecarregarButton type="button" onClick={handleAtualizar} />
          <FecharButton type="button" onClick={onClose} />
        </div>
      }
    >
      <div className="templates-modal-layout">
        <div className="templates-modal-scroll">
          <TemplatesMetaTab
            enabled={show}
            mensagemType={mensagemType}
            onSalvarVincular={onSalvarVincular}
            onClose={onClose}
          />
        </div>
      </div>
    </DraggableModal>
  );
};

export default TemplatesModal;

