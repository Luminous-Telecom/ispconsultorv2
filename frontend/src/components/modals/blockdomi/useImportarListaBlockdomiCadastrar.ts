import { useState, useCallback, type MutableRefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BlockdomiService } from 'services/blockdomiService';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import type { BlockdomiImportTranslateFn } from './importarListaBlockdomiTypes';
import type { ClassifiedList } from './importarListaBlockdomiTypes';
import type { PendingPdfFiles } from './importarListaBlockdomiTypes';
import { hasPlanilhaDominiosFonte } from './importarListaBlockdomiUtils';

interface UseImportarListaBlockdomiCadastrarParams {
  classified: ClassifiedList | null;
  totalValid: number;
  listaModo: 'bloqueio' | 'desbloqueio';
  nomeOficio: string;
  dataInicioBloqueio: string;
  dataFimBloqueio: string;
  linkOficioAnatel: string;
  linkOficioJustica: string;
  linkPlanilhaDominios: string;
  numeroSeiAnatel: string;
  pdfOficioAnatel: File | null;
  pdfOficioJustica: File | null;
  pdfFile: File | null;
  pendingPdfFilesRef: MutableRefObject<PendingPdfFiles>;
  resetFormAfterCadastro: () => void;
  onClearPdfExtractProgress: () => void;
  onSuccess?: () => void;
  showApiError: (error: unknown, fallback?: string) => void;
  success: (message: string) => void;
  t: BlockdomiImportTranslateFn;
}

export function useImportarListaBlockdomiCadastrar({
  classified,
  totalValid,
  listaModo,
  nomeOficio,
  dataInicioBloqueio,
  dataFimBloqueio,
  linkOficioAnatel,
  linkOficioJustica,
  linkPlanilhaDominios,
  numeroSeiAnatel,
  pdfOficioAnatel,
  pdfOficioJustica,
  pdfFile,
  pendingPdfFilesRef,
  resetFormAfterCadastro,
  onClearPdfExtractProgress,
  onSuccess,
  showApiError,
  success,
  t,
}: UseImportarListaBlockdomiCadastrarParams) {
  const queryClient = useQueryClient();
  const [isCadastrando, setIsCadastrando] = useState(false);

  const handleCadastrar = useCallback(async () => {
    if (!classified || totalValid === 0) return;
    if (listaModo === 'desbloqueio' && !window.confirm(t('blockdomi.removerListaConfirm'))) {
      return;
    }
    if (listaModo === 'bloqueio') {
      if (!numeroSeiAnatel.trim()) {
        showApiError(t('blockdomi.seiAnatelRequired'));
        return;
      }
      if (!nomeOficio.trim()) {
        showApiError(t('blockdomi.nomeOficioRequired'));
        return;
      }
      if (!dataInicioBloqueio.trim()) {
        showApiError(t('blockdomi.dataInicioRequired'));
        return;
      }
      if (
        !hasPlanilhaDominiosFonte(
          linkPlanilhaDominios,
          pdfFile,
          pendingPdfFilesRef.current.main
        )
      ) {
        showApiError(t('blockdomi.pdfUrlOrLinkRequired'));
        return;
      }
    }
    setIsCadastrando(true);
    try {
      if (listaModo === 'desbloqueio') {
        const result = await BlockdomiService.removerLista({
          dominios: classified.dominios,
          ipv4: classified.ipv4,
          ipv6: classified.ipv6
        });
        const parts: string[] = [];
        if (result.dominios.deleted > 0) parts.push(`Domínios: ${result.dominios.deleted} removido(s)`);
        if (result.ipv4.deleted > 0) parts.push(`IPv4: ${result.ipv4.deleted} removido(s)`);
        if (result.ipv6.deleted > 0) parts.push(`IPv6: ${result.ipv6.deleted} removido(s)`);
        const nf = result.dominios.notFound + result.ipv4.notFound + result.ipv6.notFound;
        if (nf > 0) parts.push(`${nf} não encontrado(s) no cadastro`);
        success(parts.length > 0 ? parts.join('. ') + '.' : 'Nenhum item removido.');
        queryClient.invalidateQueries({ queryKey: ['dominios'] });
        queryClient.invalidateQueries({ queryKey: ['ipv4'] });
        queryClient.invalidateQueries({ queryKey: ['ipv6'] });
        onSuccess?.();
        resetFormAfterCadastro();
        onClearPdfExtractProgress();
        return;
      }

      const nomeOficioVal = nomeOficio.trim();
      const dataInicioVal = dataInicioBloqueio.trim();
      const dataFimVal = dataFimBloqueio.trim() || null;

      let linkAnatelVal = linkOficioAnatel.trim() || null;
      let linkJusticaVal = linkOficioJustica.trim() || null;
      let linkPlanilhaVal = linkPlanilhaDominios.trim() || null;

      const pend = pendingPdfFilesRef.current;
      if (pend.anatel) {
        const { url } = await BlockdomiService.uploadOficioPdf(pend.anatel);
        linkAnatelVal = url;
      } else if (pdfOficioAnatel) {
        const { url } = await BlockdomiService.uploadOficioPdf(pdfOficioAnatel);
        linkAnatelVal = url;
      }
      if (pend.justica) {
        const { url } = await BlockdomiService.uploadOficioPdf(pend.justica);
        linkJusticaVal = url;
      } else if (pdfOficioJustica) {
        const { url } = await BlockdomiService.uploadOficioPdf(pdfOficioJustica);
        linkJusticaVal = url;
      }
      if (pend.main) {
        const { url } = await BlockdomiService.uploadOficioPdf(pend.main);
        linkPlanilhaVal = url;
      } else if (pdfFile) {
        const { url } = await BlockdomiService.uploadOficioPdf(pdfFile);
        linkPlanilhaVal = url;
      }

      const seiVal = numeroSeiAnatel.trim();
      const result = await BlockdomiService.importarLista({
        dominios: classified.dominios,
        ipv4: classified.ipv4,
        ipv6: classified.ipv6,
        nome_oficio: nomeOficioVal,
        data_inicio_bloqueio: dataInicioVal,
        data_fim_bloqueio: dataFimVal,
        link_oficio_anatel: linkAnatelVal,
        link_oficio_justica: linkJusticaVal,
        link_planilha_dominios: linkPlanilhaVal,
        numero_sei_anatel: seiVal
      });
      const { versao_lista: versaoLista, dominios: domRes, ipv4: ipv4Res, ipv6: ipv6Res } = result;
      const errs = [...domRes.errors, ...ipv4Res.errors, ...ipv6Res.errors];
      const parts: string[] = [`Lista versão ${versaoLista}`];
      if (domRes.created + domRes.updated > 0) parts.push(`Domínios: ${domRes.created} criado(s), ${domRes.updated} atualizado(s)`);
      if (ipv4Res.created + ipv4Res.updated > 0) parts.push(`IPv4: ${ipv4Res.created} criado(s), ${ipv4Res.updated} atualizado(s)`);
      if (ipv6Res.created + ipv6Res.updated > 0) parts.push(`IPv6: ${ipv6Res.created} criado(s), ${ipv6Res.updated} atualizado(s)`);
      const skipTotal = domRes.skipped + ipv4Res.skipped + ipv6Res.skipped;
      if (skipTotal > 0) parts.push(`${t('blockdomi.alreadyRegisteredIgnored')}: ${skipTotal}`);
      if (classified.invalidos.length > 0) parts.push(`Inválidos: ${classified.invalidos.length}`);
      success(parts.length > 0 ? parts.join('. ') + '.' : 'Importação concluída.');
      if (errs.length > 0) {
        showApiError(errs.slice(0, 3).join('; ') + (errs.length > 3 ? ` e mais ${errs.length - 3} erro(s).` : ''));
      }
      queryClient.invalidateQueries({ queryKey: ['dominios'] });
      queryClient.invalidateQueries({ queryKey: ['ipv4'] });
      queryClient.invalidateQueries({ queryKey: ['ipv6'] });
      onSuccess?.();
      resetFormAfterCadastro();
      onClearPdfExtractProgress();
    } catch (e) {
      showApiError(e, CONTEXT_ERROR_MESSAGES.BLOCKDOMI_REGISTER_ERROR);
    } finally {
      setIsCadastrando(false);
    }
  }, [
    classified,
    totalValid,
    listaModo,
    nomeOficio,
    dataInicioBloqueio,
    dataFimBloqueio,
    linkOficioAnatel,
    linkOficioJustica,
    linkPlanilhaDominios,
    numeroSeiAnatel,
    pdfOficioAnatel,
    pdfOficioJustica,
    pdfFile,
    pendingPdfFilesRef,
    resetFormAfterCadastro,
    onClearPdfExtractProgress,
    success,
    showApiError,
    onSuccess,
    queryClient,
    t,
  ]);

  return {
    isCadastrando,
    handleCadastrar,
  };
}
