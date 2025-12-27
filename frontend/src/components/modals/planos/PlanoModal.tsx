import React, { useState, useEffect } from 'react';
import { usePlanoForm } from '@/hooks/usePlanoForm';
import { useIsMobile } from '@/hooks/useMediaQuery';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import { InformacoesBasicasTab, ServicosObservacoesTab } from './plano';

interface PlanoModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  planoId?: number | null; // Se passar planoId, é edição; se não, é criação
}

const PlanoModal: React.FC<PlanoModalProps> = ({ 
  show, 
  onClose, 
  onSuccess,
  planoId 
}) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('informacoes-basicas');

  // Hook de formulário com React Hook Form + Zod
  const formHook = usePlanoForm({
    planoId: planoId || null,
    show,
    onSuccess
  });

  // Resetar aba ativa quando modal abrir
  useEffect(() => {
    if (show) {
      setActiveTab('informacoes-basicas');
    }
  }, [show]);

  // Determinar título dinamicamente
  const modalTitle = formHook.isLoadingPlano && formHook.isEditing 
    ? 'Plano' 
    : (formHook.isEditing ? 'Editar Plano' : 'Novo Plano');

  // Renderizar conteúdo baseado no estado
  const renderContent = () => {
    // Estado de loading
    if (formHook.isLoadingPlano && formHook.isEditing) {
      return (
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-2">Carregando dados do plano...</p>
        </div>
      );
    }

    // Conteúdo normal do formulário
    return (
      <form id={formHook.isEditing ? 'plano-edit-form' : 'plano-create-form'} onSubmit={formHook.handleSubmit}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Navegação por Abas */}
          <ul className="nav nav-tabs" role="tablist" style={{ 
            flexShrink: 0, 
            marginBottom: isMobile ? '1rem' : 0, 
            marginTop: isMobile ? '0' : '1rem', 
            marginLeft: isMobile ? '0' : '1rem', 
            marginRight: isMobile ? '0' : '1rem',
            ...(isMobile && {
              display: 'flex',
              flexWrap: 'nowrap',
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch'
            })
          }}>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'informacoes-basicas' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('informacoes-basicas')}
              >
                Plano de Venda
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className={`nav-link ${activeTab === 'servicos-observacoes' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('servicos-observacoes')}
              >
                Observações
              </button>
            </li>
          </ul>

          {/* Conteúdo das Abas */}
          <div 
            className="tab-content" 
            style={{ 
              flex: 1, 
              overflow: 'auto', 
              // No mobile, ResponsiveDialog já aplica padding, então não aplicar aqui
              padding: isMobile ? '0' : '16px',
              minHeight: 0
            }}
          >
            {/* Aba Plano de Venda */}
            {activeTab === 'informacoes-basicas' && (
              <InformacoesBasicasTab
                formData={formHook.formData}
                errors={formHook.errors}
                handleInputChange={formHook.handleInputChange}
                handleServiceToggle={formHook.handleServiceToggle}
                servicosDisponiveis={[]}
                isSubmitting={formHook.isSubmitting}
              />
            )}

            {/* Aba Observações */}
            {activeTab === 'servicos-observacoes' && (
              <ServicosObservacoesTab
                formData={formHook.formData}
                errors={formHook.errors}
                handleInputChange={formHook.handleInputChange}
                handleServiceToggle={formHook.handleServiceToggle}
                servicosDisponiveis={[]}
                isSubmitting={formHook.isSubmitting}
              />
            )}
          </div>
        </div>
      </form>
    );
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={modalTitle}
      size="xl"
      modalId={formHook.isEditing ? 'plano-edit-modal' : 'plano-create-modal'}
      headerActions={
        // Mostrar headerActions apenas quando não estiver carregando
        !(formHook.isLoadingPlano && formHook.isEditing) ? (
          <div className="d-flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<i className="bi bi-x-lg"></i>}
              onClick={onClose}
              disabled={formHook.isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={formHook.isEditing ? 'plano-edit-form' : 'plano-create-form'}
              variant="primary"
              size="sm"
              leftIcon={<i className="bi bi-check-lg"></i>}
              isLoading={formHook.isSubmitting}
            >
              Salvar
            </Button>
          </div>
        ) : undefined
      }
    >
      {renderContent()}
    </DraggableModal>
  );
};

export default PlanoModal;
