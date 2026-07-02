import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlanoService } from 'services/planoService';
import { ClienteService } from 'services/clienteService';
import { ContratoService } from 'services/contratoService';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useEntitySelectField } from 'hooks/useEntitySelectField';
import { useTituloForm } from 'hooks/useTituloForm';
import { useI18n } from 'contexts/I18nContext';
import type { Contrato } from 'types';
import { TituloModalProps } from '../types';
import {
  calcularProximaDataVencimento,
  findContratoAtivo,
  findPlanoValorMensal,
  getValorTitulo,
} from './tituloModalUtils';

type ContratoPreenchimento = {
  id?: number;
  plano_id?: number;
  desconto_percentual?: number | string | null;
  desconto_valor?: number | string | null;
  valor_final?: string | number | null;
};

export function useTituloModal({
  show,
  onClose,
  onSuccess,
  tituloId = null,
  clienteId,
  contratoId,
  isAvulso = false,
}: TituloModalProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [internalTituloId, setInternalTituloId] = useState<number | null>(tituloId);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    setInternalTituloId(tituloId);
  }, [tituloId]);

  useEffect(() => {
    if (!show) {
      setInternalTituloId(tituloId);
    }
  }, [show, tituloId]);

  const isEditMode = !!internalTituloId;

  const formHook = useTituloForm({
    tituloId: internalTituloId,
    clienteId,
    contratoId,
    show,
    isAvulso,
    onSuccess: () => {
      onSuccess?.();
    },
  });

  const formData = formHook.formData;
  const errors = formHook.errors;
  const planoSelect = useEntitySelectField<{ id: number }>();
  const clienteSelect = useEntitySelectField<{ id: number }>();

  const { data: planos } = useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.list({ status: 'ativo', limit: 100 }),
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes-ativos'],
    queryFn: () => ClienteService.list({ ativo: true, limit: 100 }),
    enabled: isEditMode,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const { data: clienteData } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: () => ClienteService.getById(clienteId!),
    enabled: !isEditMode && !!clienteId,
  });

  const { data: contratoData } = useQuery({
    queryKey: ['contrato', contratoId],
    queryFn: () => ContratoService.getById(contratoId!),
    enabled: !isEditMode && !!contratoId,
  });

  const tituloRecord = formHook.titulo;

  const { data: clienteTituloData } = useQuery({
    queryKey: ['cliente-titulo', tituloRecord?.cliente_id],
    queryFn: () => ClienteService.getById(tituloRecord!.cliente_id),
    enabled: isEditMode && !!tituloRecord?.cliente_id && !tituloRecord?.cliente,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const { data: contratoTituloData } = useQuery({
    queryKey: ['contrato-titulo', tituloRecord?.contrato_id],
    queryFn: () => ContratoService.getById(tituloRecord!.contrato_id!),
    enabled: isEditMode && !!tituloRecord?.contrato_id && !tituloRecord?.contrato,
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const tituloEnriquecido = useMemo(() => {
    if (!tituloRecord) {
      return undefined;
    }

    let enriched = tituloRecord;

    if (!enriched.cliente && clienteTituloData) {
      enriched = { ...enriched, cliente: clienteTituloData };
    }

    if (!enriched.contrato && contratoTituloData) {
      enriched = { ...enriched, contrato: contratoTituloData as Contrato };
    }

    return enriched;
  }, [tituloRecord, clienteTituloData, contratoTituloData]);

  const tituloData = tituloEnriquecido ? { success: true, data: tituloEnriquecido } : undefined;
  const isLoadingTitulo = formHook.isLoadingTitulo;
  const tituloRegistradoNoBanco = formHook.tituloRegistradoNoBanco;
  const valorTitulo = getValorTitulo(tituloData?.data);

  const preencherValorAvulso = (planoId: number, contratoValorFinal?: string | number | null) => {
    if (!isAvulso) {
      return;
    }
    if (contratoValorFinal && parseFloat(String(contratoValorFinal)) > 0) {
      formHook.handleInputChange('valor', parseFloat(String(contratoValorFinal)));
      return;
    }
    const valorMensal = findPlanoValorMensal(planos?.data, planoId);
    if (valorMensal !== null) {
      formHook.handleInputChange('valor', valorMensal);
    }
  };

  const preencherContrato = (contrato: ContratoPreenchimento) => {
    if (!contrato.plano_id) {
      return;
    }
    const dataVencimento = calcularProximaDataVencimento(15);

    formHook.handleInputChange('plano_id', contrato.plano_id);
    if (contrato.id) {
      formHook.handleInputChange('contrato_id', contrato.id);
    }
    formHook.handleInputChange('data_vencimento', dataVencimento);
    if (contrato.desconto_percentual != null) {
      formHook.handleInputChange('desconto_percentual', Number(contrato.desconto_percentual));
    }
    if (contrato.desconto_valor != null) {
      formHook.handleInputChange('desconto_valor', Number(contrato.desconto_valor));
    }

    preencherValorAvulso(contrato.plano_id, contrato.valor_final);
    hasInitializedRef.current = true;
  };

  useEffect(() => {
    if (!show || isEditMode || hasInitializedRef.current) {
      return;
    }

    if (contratoData && contratoData.plano_id && formData.plano_id === 0) {
      preencherContrato(contratoData);
    } else if (!contratoId && clienteData?.contratos && clienteData.contratos.length > 0 && formData.plano_id === 0) {
      const contratoAtivo = findContratoAtivo(clienteData.contratos);
      if (contratoAtivo?.plano_id) {
        preencherContrato(contratoAtivo);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, isEditMode, contratoData, clienteData, contratoId, formData.plano_id, isAvulso, planos]);

  useEffect(() => {
    if (!show || isEditMode || !isAvulso || !formData.plano_id || (formData.valor && formData.valor > 0)) {
      return;
    }

    const valorMensal = findPlanoValorMensal(planos?.data, formData.plano_id);
    if (valorMensal !== null) {
      formHook.handleInputChange('valor', valorMensal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, isEditMode, isAvulso, formData.plano_id, formData.valor, planos]);

  useEffect(() => {
    if (!show) {
      hasInitializedRef.current = false;
    }
  }, [show]);

  const handleCancel = () => {
    onClose();
  };

  return {
    t,
    isMobile,
    show,
    isEditMode,
    isAvulso,
    internalTituloId,
    formData,
    errors,
    formHook,
    handleInputChange: formHook.handleInputChange,
    handleSubmit: formHook.handleSubmit,
    handleCancel,
    isPending: formHook.isSubmitting,
    planoSelect,
    clienteSelect,
    planos,
    clientes,
    tituloData,
    isLoadingTitulo,
    tituloRegistradoNoBanco,
    valorTitulo,
  };
}
