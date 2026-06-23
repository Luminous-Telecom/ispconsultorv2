import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePlanos } from 'hooks/usePlanos';
import { useBancos } from 'hooks/useBancos';
import { useTipoCobrancaContratosAtivos } from 'hooks/useTipoCobrancaContratos';
import { useSelectedEntity } from 'hooks/useSelectedEntity';
import DocumentoSistemaService, { DocumentoSistema } from 'services/documentoSistemaService';
import { DiasVencimentoService, type DiasVencimento } from 'services/diasVencimentoService';
import { TipoCobrancaContrato } from 'services/tipoCobrancaContratoService';
import { Contrato } from 'hooks/useContratos';
import { Banco, Plano } from 'types';
import { ContratoForm } from './types';

interface UseContratoModalFormResourcesParams {
  show: boolean;
  formData: ContratoForm;
  contratoData: Contrato | undefined;
}

export function useContratoModalFormResources({
  show,
  formData,
  contratoData,
}: UseContratoModalFormResourcesParams) {
  const { data: planosData } = usePlanos();
  const { data: bancosData } = useBancos();
  const { data: tiposCobrancaContratoData } = useTipoCobrancaContratosAtivos();
  const { data: modelosContratoData } = useQuery<{ success: boolean; data: DocumentoSistema[]; message: string }>({
    queryKey: ['modelos-documento', 'contrato'],
    queryFn: () => DocumentoSistemaService.getByType('contrato'),
    enabled: show,
  });
  const { data: diasVencimentoData } = useQuery<{ success: boolean; data: DiasVencimento[]; message: string }>({
    queryKey: ['dias-vencimento'],
    queryFn: () => DiasVencimentoService.get(),
    enabled: show,
  });

  const planos = useMemo((): Plano[] => (
    Array.isArray(planosData) ? planosData : planosData?.data || []
  ), [planosData]);
  const bancos = useMemo((): Banco[] => (
    Array.isArray(bancosData) ? bancosData : bancosData?.data || []
  ), [bancosData]);
  const tiposCobrancaContrato = useMemo((): TipoCobrancaContrato[] => (
    Array.isArray(tiposCobrancaContratoData) ? tiposCobrancaContratoData : []
  ), [tiposCobrancaContratoData]);
  const modelosContrato = useMemo((): DocumentoSistema[] => modelosContratoData?.data || [], [modelosContratoData]);
  const diasVencimento = useMemo(
    () =>
      diasVencimentoData?.data && Array.isArray(diasVencimentoData.data) ? diasVencimentoData.data : [],
    [diasVencimentoData]
  );

  const [planoSelecionado, setPlanoSelecionado] = useSelectedEntity<Plano>(formData.plano_id, planos);
  const [bancoSelecionado, setBancoSelecionado] = useSelectedEntity<Banco>(formData.conta_boleto, bancos);
  const [tipoCobrancaContratoSelecionado, setTipoCobrancaContratoSelecionado] =
    useSelectedEntity<TipoCobrancaContrato>(formData.tipo_cobranca_contrato_id ?? undefined, tiposCobrancaContrato);
  const [modeloContratoSelecionado, setModeloContratoSelecionado] = useSelectedEntity<DocumentoSistema>(
    formData.modelo_documento_id,
    modelosContrato
  );

  useEffect(() => {
    if (formData.plano_id && planos.length > 0) {
      const plano = planos.find((p) => p.id === formData.plano_id);
      if (plano && planoSelecionado?.id !== plano.id) setPlanoSelecionado(plano);
    }
  }, [formData.plano_id, planos, planoSelecionado, setPlanoSelecionado]);

  useEffect(() => {
    if (formData.conta_boleto && bancos.length > 0) {
      const banco = bancos.find((b) => b.id === formData.conta_boleto);
      if (banco && bancoSelecionado?.id !== banco.id) setBancoSelecionado(banco);
    }
  }, [formData.conta_boleto, bancos, bancoSelecionado, setBancoSelecionado]);

  useEffect(() => {
    if (formData.modelo_documento_id && modelosContrato.length > 0) {
      const modelo = modelosContrato.find((m) => m.id === formData.modelo_documento_id);
      if (modelo && modeloContratoSelecionado?.id !== modelo.id) setModeloContratoSelecionado(modelo);
    }
  }, [formData.modelo_documento_id, modelosContrato, modeloContratoSelecionado, setModeloContratoSelecionado]);

  useEffect(() => {
    if (formData.tipo_cobranca_contrato_id) {
      const tipoFromList = tiposCobrancaContrato.find((tipo) => tipo.id === formData.tipo_cobranca_contrato_id);
      const tipoFromContract =
        contratoData?.tipoCobrancaContrato &&
        contratoData.tipoCobrancaContrato.id === formData.tipo_cobranca_contrato_id
          ? (contratoData.tipoCobrancaContrato as TipoCobrancaContrato)
          : null;
      const tipo = tipoFromList ?? tipoFromContract;
      if (tipo && tipoCobrancaContratoSelecionado?.id !== tipo.id) {
        setTipoCobrancaContratoSelecionado(tipo);
      }
    }
  }, [
    formData.tipo_cobranca_contrato_id,
    tiposCobrancaContrato,
    contratoData?.tipoCobrancaContrato,
    tipoCobrancaContratoSelecionado,
    setTipoCobrancaContratoSelecionado,
  ]);

  return {
    planosData,
    bancosData,
    tiposCobrancaContrato,
    modelosContratoData,
    diasVencimento,
    planoSelecionado,
    setPlanoSelecionado,
    bancoSelecionado,
    setBancoSelecionado,
    tipoCobrancaContratoSelecionado,
    setTipoCobrancaContratoSelecionado,
    modeloContratoSelecionado,
    setModeloContratoSelecionado,
  };
}
