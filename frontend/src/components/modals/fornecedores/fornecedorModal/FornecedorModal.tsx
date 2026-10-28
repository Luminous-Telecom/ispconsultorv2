import React from 'react';
import DraggableModal from 'components/common/DraggableModal';
import FornecedorModalDadosBasicosTab from './FornecedorModalDadosBasicosTab';
import FornecedorModalEnderecoTab from './FornecedorModalEnderecoTab';
import FornecedorModalHeader from './FornecedorModalHeader';
import FornecedorModalLoadingState from './FornecedorModalLoadingState';
import FornecedorModalObservacoesTab from './FornecedorModalObservacoesTab';
import { useFornecedorModal } from './useFornecedorModal';
import { FornecedorModalProps } from './types';

const FornecedorModal: React.FC<FornecedorModalProps> = (props) => {
  const { show, onClose } = props;
  const modal = useFornecedorModal(props);

  const headerActions = modal.showHeaderActions ? (
    <FornecedorModalHeader
      activeTab={modal.activeTab}
      isMobile={modal.isMobile}
      isSubmitting={modal.isSubmitting}
      formId={modal.formId}
      basicDataLabel={modal.t('tabs.basicData')}
      addressLabel={modal.t('tabs.address')}
      observationsLabel={modal.t('tabs.observations')}
      errors={modal.errors}
      onClose={onClose}
      onTabChange={modal.setActiveTab}
    />
  ) : undefined;

  const renderContent = () => {
    if (modal.isLoadingFornecedor && modal.isEditing) {
      return <FornecedorModalLoadingState loadingLabel={modal.t('messages.loading')} />;
    }

    return (
      <form id={modal.formId} onSubmit={modal.handleSubmit} className="form-modal-simple">
        <div className="fornecedor-modal-content">
          <div
            className="tab-content fornecedor-tab-content fornecedor-tab-content-padded"
            id="fornecedorTabContent"
          >
            {modal.activeTab === 'dados-basicos' && (
              <FornecedorModalDadosBasicosTab
                formData={modal.formData}
                errors={modal.errors}
                formPrefix={modal.formPrefix}
                entityId={modal.fornecedorId}
                personTypeLabel={modal.t('form.personType')}
                personTypePhysicalLabel={modal.t('form.personTypePhysical')}
                personTypeLegalLabel={modal.t('form.personTypeLegal')}
                cpfLabel={modal.t('form.cpf')}
                cnpjLabel={modal.t('form.cnpj')}
                cnpjPlaceholder={modal.t('placeholder.cnpj')}
                nameLabel={modal.t('form.name')}
                companyNameLabel={modal.t('form.companyName')}
                tradeNameLabel={modal.t('form.tradeName')}
                onInputChange={modal.handleInputChange}
                onTipoPessoaChange={modal.handleTipoPessoaChange}
              />
            )}

            {modal.activeTab === 'endereco' && (
              <FornecedorModalEnderecoTab
                formData={modal.formData}
                errors={modal.errors}
                formPrefix={modal.formPrefix}
                zipCodeLabel={modal.t('form.zipCode')}
                addressLabel={modal.t('form.address')}
                numberLabel={modal.t('form.number')}
                complementLabel={modal.t('form.complement')}
                neighborhoodLabel={modal.t('form.neighborhood')}
                cityLabel={modal.t('form.city')}
                stateLabel={modal.t('form.state')}
                countryLabel={modal.t('form.country')}
                onInputChange={modal.handleInputChange}
              />
            )}

            {modal.activeTab === 'observacoes' && (
              <FornecedorModalObservacoesTab
                formData={modal.formData}
                errors={modal.errors}
                formPrefix={modal.formPrefix}
                observationsLabel={modal.t('form.observations')}
                onInputChange={modal.handleInputChange}
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
      title={modal.modalTitle}
      size="xl"
      modalId={modal.modalId}
      headerActions={headerActions}
    >
      {renderContent()}
    </DraggableModal>
  );
};

export default FornecedorModal;
