import React from 'react';
import ReceberModalCore from 'components/modals/receber/ReceberModalCore';
import type { ReceberTarget } from 'components/modals/receber/receberModalTypes';
import type { SaasTitulo } from 'services/saas/saasCrudService';

interface SaasReceberModalProps {
  isOpen: boolean;
  onClose: () => void;
  titulo: SaasTitulo | null;
  empresaNome?: string;
  onSuccess?: () => void;
}

const SaasReceberModal: React.FC<SaasReceberModalProps> = ({
  isOpen,
  onClose,
  titulo,
  empresaNome,
  onSuccess,
}) => {
  const target: ReceberTarget | null = titulo
    ? {
        id: titulo.id,
        numero_titulo: titulo.numero_titulo,
        valor: titulo.valor ?? 0,
        data_vencimento: titulo.data_vencimento,
        clienteLabel: empresaNome || '—',
      }
    : null;

  return (
    <ReceberModalCore
      variant="saas"
      isOpen={isOpen}
      onClose={onClose}
      target={target}
      onSuccess={onSuccess}
    />
  );
};

export default SaasReceberModal;
