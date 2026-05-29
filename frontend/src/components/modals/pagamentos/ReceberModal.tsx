import React from 'react';
import ReceberModalCore from 'components/modals/receber/ReceberModalCore';
import type { ReceberTarget } from 'components/modals/receber/receberModalTypes';

interface ReceberModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcela: {
    id: number;
    numero_titulo: string;
    valor_parcela: number;
    data_vencimento: string;
    cliente?: { razao_social: string };
  } | null;
  onSuccess?: () => void;
}

const ReceberModal: React.FC<ReceberModalProps> = ({ isOpen, onClose, parcela, onSuccess }) => {
  const target: ReceberTarget | null = parcela
    ? {
        id: parcela.id,
        numero_titulo: parcela.numero_titulo,
        valor: parcela.valor_parcela,
        data_vencimento: parcela.data_vencimento,
        clienteLabel: parcela.cliente?.razao_social || 'N/A',
      }
    : null;

  return (
    <ReceberModalCore
      variant="erp"
      isOpen={isOpen}
      onClose={onClose}
      target={target}
      onSuccess={onSuccess}
    />
  );
};

export default ReceberModal;
