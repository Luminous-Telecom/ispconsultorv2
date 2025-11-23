import React, { useState, useEffect } from 'react';
import { usePlanoForm } from '@/hooks/usePlanoForm';
import { useIsMobile } from '@/hooks/useMediaQuery';
import DraggableModal from '@/components/common/DraggableModal';
import { InformacoesBasicasTab, DescontosConfiguracoesTab, ServicosObservacoesTab } from './plano';

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

  const servicosDisponiveis = [
    'Internet',
    'Telefone',
    'TV por Assinatura',
    'Suporte Técnico',
    'Backup em Nuvem',
    'Antivírus',
    'Firewall'
  ];

  if (formHook.isLoadingPlano && formHook.isEditing) {
    return (
      <DraggableModal show={show} onClose={onClose} title="Plano" size="xl" modalId="plano-modal-loading">
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
          <p className="mt-2">Carregando dados do plano...</p>
        </div>
      </DraggableModal>
    );
  }

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={formHook.isEditing ? 'Editar Plano' : 'Novo Plano'}
      modalId={formHook.isEditing ? 'plano-edit-modal' : 'plano-create-modal'}
      headerActions={
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={formHook.isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form={formHook.isEditing ? 'plano-edit-form' : 'plano-create-form'}
            className="btn btn-primary btn-sm"
            disabled={formHook.isSubmitting}
          >
            Salvar
          </button>
        </div>
      }
    >
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
                    Informações Básicas
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'descontos-configuracoes' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('descontos-configuracoes')}
                  >
                    Descontos e Configurações
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    className={`nav-link ${activeTab === 'servicos-observacoes' ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveTab('servicos-observacoes')}
                  >
                    Serviços e Observações
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
                {/* Aba Informações Básicas */}
                {activeTab === 'informacoes-basicas' && (
                  <InformacoesBasicasTab
                    formData={formHook.formData}
                    errors={formHook.errors}
                    handleInputChange={formHook.handleInputChange}
                    handleServiceToggle={formHook.handleServiceToggle}
                    servicosDisponiveis={servicosDisponiveis}
                    isSubmitting={formHook.isSubmitting}
                  />
                )}

                {/* Aba Descontos e Configurações */}
                {activeTab === 'descontos-configuracoes' && (
                  <DescontosConfiguracoesTab
                    formData={formHook.formData}
                    errors={formHook.errors}
                    handleInputChange={formHook.handleInputChange}
                    handleServiceToggle={formHook.handleServiceToggle}
                    servicosDisponiveis={servicosDisponiveis}
                    isSubmitting={formHook.isSubmitting}
                  />
                )}

                {/* Aba Serviços e Observações */}
                {activeTab === 'servicos-observacoes' && (
                  <ServicosObservacoesTab
                    formData={formHook.formData}
                    errors={formHook.errors}
                    handleInputChange={formHook.handleInputChange}
                    handleServiceToggle={formHook.handleServiceToggle}
                    servicosDisponiveis={servicosDisponiveis}
                    isSubmitting={formHook.isSubmitting}
                  />
                )}
              </div>
            </div>
          </form>
    </DraggableModal>
  );
};

export default PlanoModal;
