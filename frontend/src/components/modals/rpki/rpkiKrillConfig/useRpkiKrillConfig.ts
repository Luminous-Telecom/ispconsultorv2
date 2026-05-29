import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { RpkiCaService, type RpkiCaRepository } from 'services/rpkiCaService';
import { formatResourceBlocks } from './resourceBlocks';
import type { AspaItem, CaItem, CaSelectOption } from './types';

export function useRpkiKrillConfig() {
  const [aspas, setAspas] = useState<AspaItem[]>([]);
  const { success, warning: showWarning } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  const casCardRef = useRef<HTMLDivElement>(null);
  const casPaiCardRef = useRef<HTMLDivElement>(null);
  const repositoriosCardRef = useRef<HTMLDivElement>(null);
  const aspasCardRef = useRef<HTMLDivElement>(null);

  const [caNome, setCaNome] = useState('');

  const [parentCaId, setParentCaId] = useState('');
  const [parentChildRequestXml, setParentChildRequestXml] = useState('');
  const [parentResponseXml, setParentResponseXml] = useState('');
  const [parentNome, setParentNome] = useState('');

  const [repositoryCaId, setRepositoryCaId] = useState('');
  const [repositoryReferralParentId, setRepositoryReferralParentId] = useState('');
  const [repositoryParentResponseSnippet, setRepositoryParentResponseSnippet] = useState('');
  const [repositoryRequestXml, setRepositoryRequestXml] = useState('');
  const [repositoryResponseXml, setRepositoryResponseXml] = useState('');

  const [aspaCaId, setAspaCaId] = useState('');
  const [customerAsn, setCustomerAsn] = useState('');
  const [providers, setProviders] = useState('');

  const {
    data: cas = [],
    isLoading: isLoadingCas,
  } = useQuery({
    queryKey: ['rpki-cas'],
    queryFn: async () => {
      const rows = await RpkiCaService.list();
      return rows.map((row) => ({
        id: row.id,
        nome: row.nome,
        handleInterno: row.handle,
      })) as CaItem[];
    },
  });

  const selectedParentCaId = Number(parentCaId || 0);
  const fallbackParentCaId = cas.length > 0 ? Number(cas[0]?.id || 0) : 0;
  const effectiveParentCaId = selectedParentCaId || fallbackParentCaId;

  const { data: parentsFromApi = [] } = useQuery({
    queryKey: ['rpki-ca-parents', effectiveParentCaId],
    queryFn: async () => {
      if (!effectiveParentCaId) return [];
      return RpkiCaService.listParents(effectiveParentCaId);
    },
    enabled: effectiveParentCaId > 0,
  });

  const { data: resourcesFromApi = [] } = useQuery({
    queryKey: ['rpki-ca-resources', effectiveParentCaId],
    queryFn: async () => {
      if (!effectiveParentCaId) return [];
      return RpkiCaService.listResources(effectiveParentCaId);
    },
    enabled: effectiveParentCaId > 0,
  });

  const createCaMutation = useMutation({
    mutationFn: RpkiCaService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rpki-cas'] });
      success('CA criada com sucesso');
      setCaNome('');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_CA_CREATE_ERROR),
  });

  const generateChildRequestMutation = useMutation({
    mutationFn: (caId: number) => RpkiCaService.generateChildRequest(caId),
    onSuccess: (result) => {
      setParentChildRequestXml(result.xml);
      success('Requisição da CA-filha gerada com sucesso');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_CA_CHILD_REQUEST_ERROR),
  });

  const importParentResponseMutation = useMutation({
    mutationFn: (payload: { caId: number; parentName: string; responseXml: string }) =>
      RpkiCaService.importParentResponse(payload),
    onSuccess: () => {
      success('CA-pai vinculada com sucesso');
      if (effectiveParentCaId > 0) {
        queryClient.invalidateQueries({ queryKey: ['rpki-ca-parents', effectiveParentCaId] });
      }
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_CA_PARENT_LINK_ERROR),
  });

  const syncParentResourcesMutation = useMutation({
    mutationFn: (payload: { caId: number; parentId: number }) => RpkiCaService.syncParentResources(payload),
    onSuccess: () => {
      success('Recursos da CA-pai sincronizados com sucesso');
      if (effectiveParentCaId > 0) {
        queryClient.invalidateQueries({ queryKey: ['rpki-ca-parents', effectiveParentCaId] });
        queryClient.invalidateQueries({ queryKey: ['rpki-ca-resources', effectiveParentCaId] });
      }
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_CA_PARENT_SYNC_ERROR),
  });

  const selectedRepoCaId = Number(repositoryCaId || 0);

  const { data: repositoryParentsFromApi = [] } = useQuery({
    queryKey: ['rpki-ca-parents', selectedRepoCaId],
    queryFn: () => RpkiCaService.listParents(selectedRepoCaId),
    enabled: selectedRepoCaId > 0,
  });

  const { data: repositoriesFromApi = [] } = useQuery({
    queryKey: ['rpki-ca-repositories', selectedRepoCaId],
    queryFn: () => RpkiCaService.listRepositories(selectedRepoCaId),
    enabled: selectedRepoCaId > 0,
  });

  const generatePublisherRequestMutation = useMutation({
    mutationFn: (payload: {
      caId: number;
      parentId?: number;
      parentResponseXml?: string;
    }) => RpkiCaService.generatePublisherRequest(payload),
    onSuccess: (result) => {
      setRepositoryRequestXml(result.xml);
      setRepositoryParentResponseSnippet('');
      success('publisher_request gerado (RFC 8183)');
      if (result.warning?.trim()) {
        showWarning(result.warning.trim());
      }
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_REPOSITORY_PUBLISHER_ERROR),
  });

  const importRepositoryResponseMutation = useMutation({
    mutationFn: (payload: { caId: number; responseXml: string }) =>
      RpkiCaService.importRepositoryResponse(payload),
    onSuccess: (row, variables) => {
      success('Repositório vinculado com sucesso');
      if (variables.caId > 0) {
        queryClient.setQueryData<RpkiCaRepository[]>(
          ['rpki-ca-repositories', variables.caId],
          (prev = []) => {
            const next = prev.filter((item) => item.id !== row.id);
            return [row, ...next];
          }
        );
        queryClient.invalidateQueries({ queryKey: ['rpki-ca-repositories', variables.caId] });
      }
      setRepositoryCaId(String(variables.caId));
      setRepositoryResponseXml('');
      setRepositoryRequestXml('');
      setRepositoryReferralParentId('');
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.RPKI_REPOSITORY_IMPORT_ERROR),
  });

  const repositoryReferralParentOptions = [
    { value: '', label: 'Sem referral (opcional)' },
    ...repositoryParentsFromApi.map((parent) => ({
      value: String(parent.id),
      label: `${parent.parent_name} (${parent.parent_handle ?? '—'})`,
    })),
  ];

  const caOptions: CaSelectOption[] = cas.map((ca) => ({
    value: ca.id,
    label: ca.nome,
  }));

  const asnBlocks = formatResourceBlocks(resourcesFromApi, 'asn');
  const ipv4Blocks = formatResourceBlocks(resourcesFromApi, 'ipv4');
  const ipv6Blocks = formatResourceBlocks(resourcesFromApi, 'ipv6');

  const handleCreateCa = () => {
    if (!caNome.trim()) return;
    createCaMutation.mutate({ nome: caNome.trim() });
  };

  const handleGenerateChildRequest = () => {
    if (!parentCaId.trim()) return;
    const selectedCa = cas.find((ca) => String(ca.id) === parentCaId);
    if (!selectedCa) return;
    generateChildRequestMutation.mutate(Number(selectedCa.id));
  };

  const handleImportParentResponse = () => {
    if (!parentCaId.trim() || !parentChildRequestXml.trim() || !parentResponseXml.trim() || !parentNome.trim()) {
      return;
    }
    const selectedCa = cas.find((ca) => String(ca.id) === parentCaId);
    if (!selectedCa) return;
    importParentResponseMutation.mutate(
      {
        caId: Number(selectedCa.id),
        parentName: parentNome.trim(),
        responseXml: parentResponseXml.trim(),
      },
      {
        onSuccess: () => {
          setParentCaId('');
          setParentChildRequestXml('');
          setParentResponseXml('');
          setParentNome('');
        },
      }
    );
  };

  const handleSyncParentResources = (caId: number, parentId: number) => {
    if (!caId || !parentId) return;
    syncParentResourcesMutation.mutate({ caId, parentId });
  };

  const handleRepositoryCaChange = (value: string) => {
    setRepositoryCaId(value);
    setRepositoryReferralParentId('');
  };

  const handleGeneratePublisherRequest = () => {
    if (!repositoryCaId.trim()) return;
    const caId = Number(repositoryCaId);
    const parentId = Number(repositoryReferralParentId || 0);
    const snippet = repositoryParentResponseSnippet.trim();
    generatePublisherRequestMutation.mutate({
      caId,
      ...(parentId > 0 ? { parentId } : {}),
      ...(snippet ? { parentResponseXml: snippet } : {}),
    });
  };

  const handleImportRepositoryResponse = () => {
    if (!repositoryCaId.trim() || !repositoryResponseXml.trim()) return;
    importRepositoryResponseMutation.mutate({
      caId: Number(repositoryCaId),
      responseXml: repositoryResponseXml.trim(),
    });
  };

  const handleSaveAspa = () => {
    if (!aspaCaId.trim() || !customerAsn.trim() || !providers.trim()) return;
    const selectedCa = cas.find((ca) => String(ca.id) === aspaCaId);
    if (!selectedCa) return;
    setAspas((prev) => [
      {
        id: Date.now(),
        caNome: selectedCa.nome,
        customerAsn: customerAsn.trim(),
        providers: providers.trim(),
      },
      ...prev,
    ]);
    setAspaCaId('');
    setCustomerAsn('');
    setProviders('');
  };

  return {
    refs: {
      casCardRef,
      casPaiCardRef,
      repositoriosCardRef,
      aspasCardRef,
    },
    casSection: {
      caNome,
      setCaNome,
      cas,
      isLoadingCas,
      createCaMutation,
      handleCreateCa,
    },
    casPaiSection: {
      parentCaId,
      setParentCaId,
      parentChildRequestXml,
      setParentChildRequestXml,
      parentResponseXml,
      setParentResponseXml,
      parentNome,
      setParentNome,
      caOptions,
      cas,
      parentsFromApi,
      asnBlocks,
      ipv4Blocks,
      ipv6Blocks,
      generateChildRequestMutation,
      importParentResponseMutation,
      syncParentResourcesMutation,
      handleGenerateChildRequest,
      handleImportParentResponse,
      handleSyncParentResources,
    },
    repositoriosSection: {
      repositoryCaId,
      repositoryReferralParentId,
      setRepositoryReferralParentId,
      repositoryParentResponseSnippet,
      setRepositoryParentResponseSnippet,
      repositoryRequestXml,
      setRepositoryRequestXml,
      repositoryResponseXml,
      setRepositoryResponseXml,
      caOptions,
      repositoryReferralParentOptions,
      selectedRepoCaId,
      repositoriesFromApi,
      generatePublisherRequestMutation,
      importRepositoryResponseMutation,
      handleRepositoryCaChange,
      handleGeneratePublisherRequest,
      handleImportRepositoryResponse,
    },
    aspasSection: {
      aspaCaId,
      setAspaCaId,
      customerAsn,
      setCustomerAsn,
      providers,
      setProviders,
      caOptions,
      aspas,
      handleSaveAspa,
    },
  };
}
