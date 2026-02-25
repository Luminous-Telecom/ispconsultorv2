import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from '@/contexts/I18nContext';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import TemplatesTab from './abas/TemplatesTab';

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
      className="no-padding"
      headerActions={
        <div className="d-flex gap-2 modal-header-actions">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleAtualizar}
          >
            Atualizar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onClose}
          >
            Fechar
          </Button>
        </div>
      }
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '16px' }}>
          <TemplatesTab
        embedded={false}
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

