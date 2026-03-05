/**
 * Modal Dados da Empresa para SaaS - igual ao modo admin
 * Abre direto o formulário com abas (sem tabela/select)
 */

import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { saasDadosEmpresaService, type SaasDadosEmpresaItem, type SaasDadosEmpresaListResponse } from '@/services/saas/saasDadosEmpresaService';
import { DadosEmpresaModal } from '../empresa/empresa';

interface Props {
  show: boolean;
  onClose: () => void;
  /** ID da empresa quando aberto de um contexto específico (ex: da lista de clientes tenants) */
  itemId?: number | null;
}

const SaasDadosEmpresaModal: React.FC<Props> = ({ show, onClose, itemId: propItemId }) => {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['saas-dados-empresa-list', show],
    queryFn: () => saasDadosEmpresaService.list({ limit: 500 }),
    enabled: show,
    staleTime: 0,
  });

  const items = useMemo(() => {
    const listData = data?.data as SaasDadosEmpresaListResponse | undefined;
    const rawData = listData?.data ?? listData ?? [];
    return (Array.isArray(rawData) ? rawData : (rawData as { data?: SaasDadosEmpresaItem[] })?.data ?? []) as SaasDadosEmpresaItem[];
  }, [data]);

  const effectiveId = propItemId ?? (items.length === 1 ? items[0].id : null);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['saas-dados-empresa-list'] });
  };

  if (!show) return null;

  return (
    <DadosEmpresaModal
      show
      onClose={onClose}
      variant="saas"
      itemId={effectiveId}
      modalId="saas-dados-empresa-modal"
      onSuccess={handleSuccess}
    />
  );
};

export default SaasDadosEmpresaModal;
