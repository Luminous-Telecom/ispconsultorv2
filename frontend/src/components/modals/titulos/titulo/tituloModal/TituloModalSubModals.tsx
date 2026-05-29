import React from 'react';
import ClienteListModal from 'components/modals/clientes/ClienteListModal';
import PlanoListModal from 'components/modals/planos/PlanoListModal';
import { TituloForm } from '../types';

interface EntitySelectHandlers {
  showModal: boolean;
  closeModal: () => void;
  handleSelect: (entity: { id: number }) => void;
}

interface TituloModalSubModalsProps {
  isEditMode: boolean;
  clienteSelect: EntitySelectHandlers;
  planoSelect: EntitySelectHandlers;
  onInputChange: (field: keyof TituloForm, value: TituloForm[keyof TituloForm]) => void;
  selectClientTitle: string;
  selectPlanoTitle: string;
}

const TituloModalSubModals: React.FC<TituloModalSubModalsProps> = ({
  isEditMode,
  clienteSelect,
  planoSelect,
  onInputChange,
  selectClientTitle,
  selectPlanoTitle,
}) => (
  <>
    {isEditMode && (
      <ClienteListModal
        show={clienteSelect.showModal}
        onClose={clienteSelect.closeModal}
        onSelectClient={(cliente) => {
          onInputChange('cliente_id', cliente.id);
          clienteSelect.handleSelect(cliente);
        }}
        title={selectClientTitle}
      />
    )}

    <PlanoListModal
      show={planoSelect.showModal}
      onClose={planoSelect.closeModal}
      onSelectPlano={(plano) => {
        onInputChange('plano_id', plano.id);
        planoSelect.handleSelect(plano);
      }}
      title={selectPlanoTitle}
    />
  </>
);

export default TituloModalSubModals;
