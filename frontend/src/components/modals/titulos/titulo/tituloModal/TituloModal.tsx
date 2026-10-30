import React from 'react';
import DraggableModal from 'components/common/DraggableModal';
import { TituloModalProps } from '../types';
import TituloModalBody from './TituloModalBody';
import TituloModalHeader from './TituloModalHeader';
import TituloModalLoadingState from './TituloModalLoadingState';
import TituloModalSubModals from './TituloModalSubModals';
import { useTituloModal } from './useTituloModal';

const TituloModal: React.FC<TituloModalProps> = (props) => {
  const modal = useTituloModal(props);

  if (modal.isEditMode && modal.isLoadingTitulo) {
    return (
      <TituloModalLoadingState
        show={modal.show}
        title={modal.t('titulo.title')}
        loadingLabel={modal.t('ui.loading')}
        onClose={modal.handleCancel}
      />
    );
  }

  const bodyLabels = {
    validationErrors: modal.t('titulo.validationErrors'),
    client: modal.t('table.client'),
    plan: modal.t('table.plan'),
    value: modal.t('table.value'),
    dueDate: modal.t('table.dueDate'),
    description: modal.t('table.description'),
    observations: modal.t('table.observations'),
    clientCannotBeChanged: modal.t('titulo.clientCannotBeChanged'),
    contractCannotBeChanged: modal.t('titulo.contractCannotBeChanged'),
    planoCannotBeChanged: modal.t('titulo.planoCannotBeChanged'),
    bankCannotBeChanged: modal.t('titulo.bankCannotBeChanged'),
    valorCannotBeChanged: modal.t('titulo.valorCannotBeChanged'),
    dataVencimentoCannotBeChanged: modal.t('titulo.dataVencimentoCannotBeChanged'),
    descriptionPlaceholder: modal.t('titulo.descriptionPlaceholder'),
    observationsPlaceholder: modal.t('titulo.observationsPlaceholder'),
    discountPercent: modal.t('titulo.discountPercent'),
    discountValue: modal.t('titulo.discountValue'),
    additionPercent: modal.t('titulo.additionPercent'),
    additionValue: modal.t('titulo.additionValue'),
    clientNotFound: modal.t('titulo.clientNotFound'),
    loading: modal.t('ui.loading'),
    titleNumber: modal.t('table.titleNumber'),
    chargeId: modal.t('table.chargeId'),
    ourNumber: modal.t('table.ourNumber'),
    contract: modal.t('table.contract'),
    status: modal.t('table.status'),
    paidValue: modal.t('table.paidValue'),
    openValue: modal.t('table.openValue'),
    paymentDate: modal.t('table.paymentDate'),
    bank: modal.t('table.bank'),
    barcode: modal.t('form.barcode'),
    barcodeLine: modal.t('form.barcodeLine'),
    boletoUrl: modal.t('form.boletoUrl'),
    statusActive: modal.t('status.active'),
    statusInactive: modal.t('status.inactive'),
    statusSuspended: modal.t('status.suspended'),
    statusPending: modal.t('status.pending'),
    statusPaid: modal.t('status.paid'),
    statusOverdue: modal.t('status.overdue'),
    statusCancelled: modal.t('status.cancelled'),
    statusPartial: modal.t('status.partial'),
    statusPaidLate: modal.t('status.paidLate'),
  };

  return (
    <DraggableModal
      show={modal.show}
      onClose={modal.handleCancel}
      title={modal.t('titulo.title')}
      headerActions={
        <TituloModalHeader
          isEditMode={modal.isEditMode}
          internalTituloId={modal.internalTituloId}
          isPending={modal.isPending}
          tituloStatus={modal.tituloData?.data?.status}
          sendLabel={modal.t('titulo.send')}
          sendViaWhatsAppLabel={modal.t('titulo.sendViaWhatsApp')}
          sendViaEmailLabel={modal.t('titulo.sendViaEmail')}
          sendReceiptLabel={modal.t('titulo.sendReceipt')}
          sendSuccessMessage={modal.t('titulo.messages.sendSuccess')}
          onClose={modal.handleCancel}
        />
      }
    >
      <TituloModalBody
        isMobile={modal.isMobile}
        isEditMode={modal.isEditMode}
        isAvulso={modal.isAvulso}
        isPending={modal.isPending}
        errors={modal.errors}
        formData={modal.formData}
        tituloRegistradoNoBanco={modal.tituloRegistradoNoBanco}
        valorTitulo={modal.valorTitulo}
        tituloData={modal.tituloData}
        clientes={modal.clientes}
        planos={modal.planos}
        onSubmit={modal.handleSubmit}
        onInputChange={modal.handleInputChange}
        onShowPlanoModal={modal.planoSelect.openModal}
        labels={bodyLabels}
      />

      <TituloModalSubModals
        isEditMode={modal.isEditMode}
        clienteSelect={modal.clienteSelect}
        planoSelect={modal.planoSelect}
        onInputChange={modal.handleInputChange}
        selectClientTitle={modal.t('titulo.selectClient')}
        selectPlanoTitle={modal.t('titulo.selectPlano')}
      />
    </DraggableModal>
  );
};

export default TituloModal;
