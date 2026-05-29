import React, { useEffect, useRef, useState } from 'react';
import {
  ConfirmarButton,
  FormField,
  GerarButton,
  GerarRequisicaoCaFilhaButton,
  NovoButton,
  SalvarButton,
  SincronizarButton,
} from 'components/ui';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RpkiCaService, type RpkiCaRepository } from 'services/rpkiCaService';

interface RpkiKrillConfigModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
  initialSection?: 'cas' | 'cas-pai' | 'repositorios' | 'aspas';
}

interface CaItem {
  id: number;
  nome: string;
  handleInterno: string;
}

interface AspaItem {
  id: number;
  caNome: string;
  customerAsn: string;
  providers: string;
}

const RpkiKrillConfigModal: React.FC<RpkiKrillConfigModalProps> = ({ initialSection }) => {
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
      const rows = await RpkiCaService.listParents(effectiveParentCaId);
      return rows;
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
    ...repositoryParentsFromApi.map((p) => ({
      value: String(p.id),
      label: `${p.parent_name} (${p.parent_handle ?? '—'})`,
    })),
  ];

  const caOptions = cas.map((ca) => ({
    value: ca.id,
    label: ca.nome,
  }));

  const asnBlocks = resourcesFromApi
    .filter((r) => r.resource_type === 'asn')
    .map((r) => (r.end_range ? `${r.start_range}-${r.end_range}` : r.start_range))
    .join(', ') || '-';

  const ipv4Blocks = resourcesFromApi
    .filter((r) => r.resource_type === 'ipv4')
    .map((r) => (r.end_range ? `${r.start_range}-${r.end_range}` : r.start_range))
    .join(', ') || '-';

  const ipv6Blocks = resourcesFromApi
    .filter((r) => r.resource_type === 'ipv6')
    .map((r) => (r.end_range ? `${r.start_range}-${r.end_range}` : r.start_range))
    .join(', ') || '-';

  const isSingleSectionMode = Boolean(initialSection);
  const showCasSection = !isSingleSectionMode || initialSection === 'cas';
  const showCasPaiSection = !isSingleSectionMode || initialSection === 'cas-pai';
  const showRepositoriosSection = !isSingleSectionMode || initialSection === 'repositorios';
  const showAspasSection = !isSingleSectionMode || initialSection === 'aspas';

  useEffect(() => {
    if (!initialSection) return;

    const sectionMap = {
      cas: casCardRef,
      'cas-pai': casPaiCardRef,
      repositorios: repositoriosCardRef,
      aspas: aspasCardRef,
    } as const;

    const sectionRef = sectionMap[initialSection];
    const timer = window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [initialSection]);

  return (
    <div className="p-3">
      {showCasSection && (
      <div ref={casCardRef} className="card mb-3">
        <div className="card-header">CAs</div>
        <div className="card-body">
          <div className="row g-2 mb-2">
            <div className="col-md-8">
              <FormField name="ca_nome" label="Nome da CA" size="sm" value={caNome} onChange={(v) => setCaNome(String(v ?? ''))} />
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <NovoButton
                type="button"
                disabled={createCaMutation.isPending}
                isPending={createCaMutation.isPending}
                onClick={() => {
                  if (!caNome.trim()) return;
                  createCaMutation.mutate({ nome: caNome.trim() });
                }}
              />
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-striped mb-0">
              <thead>
                <tr>
                  <th>Nome</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingCas && (
                  <tr>
                    <td className="text-muted">Carregando...</td>
                  </tr>
                )}
                {cas.map((ca) => (
                  <tr key={ca.id}>
                    <td>{ca.nome}</td>
                  </tr>
                ))}
                {!isLoadingCas && cas.length === 0 && (
                  <tr>
                    <td colSpan={1} className="text-muted">Nenhuma CA configurada</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {showCasPaiSection && (
      <div ref={casPaiCardRef} className="card mb-3">
        <div className="card-header">CAs-pai</div>
        <div className="card-body">
          <div className="row g-2 mb-2">
            <div className="col-md-4">
              <FormField
                name="parent_ca_id"
                type="select"
                label="CA"
                size="sm"
                value={parentCaId}
                options={caOptions}
                onChange={(v) => setParentCaId(String(v ?? ''))}
              />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <GerarRequisicaoCaFilhaButton
                type="button"
                disabled={generateChildRequestMutation.isPending}
                isPending={generateChildRequestMutation.isPending}
                onClick={() => {
                  if (!parentCaId.trim()) return;
                  const selectedCa = cas.find((ca) => String(ca.id) === parentCaId);
                  if (!selectedCa) return;
                  generateChildRequestMutation.mutate(Number(selectedCa.id));
                }}
              />
            </div>
            <div className="col-md-6">
              <FormField
                name="parent_child_request_xml"
                type="textarea"
                label="Requisicao da CA-filha (XML)"
                size="sm"
                rows={3}
                value={parentChildRequestXml}
                onChange={(v) => setParentChildRequestXml(String(v ?? ''))}
              />
            </div>
          </div>

          <div className="row g-2 mb-2">
            <div className="col-md-12">
              <FormField
                name="parent_response_xml"
                type="textarea"
                label="Resposta da CA-pai (XML)"
                size="sm"
                rows={3}
                value={parentResponseXml}
                onChange={(v) => setParentResponseXml(String(v ?? ''))}
              />
            </div>
          </div>

          <div className="row g-2 mb-2">
            <div className="col-md-10">
              <FormField
                name="parent_nome"
                label="Nome da CA-pai"
                size="sm"
                value={parentNome}
                onChange={(v) => setParentNome(String(v ?? ''))}
              />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <ConfirmarButton
                type="button"
                disabled={importParentResponseMutation.isPending}
                isPending={importParentResponseMutation.isPending}
                onClick={() => {
                  if (!parentCaId.trim() || !parentChildRequestXml.trim() || !parentResponseXml.trim() || !parentNome.trim()) return;
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
                }}
              />
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-striped mb-0">
              <thead>
                <tr>
                  <th>CA</th>
                  <th>Nome da CA-pai</th>
                  <th>CA-pai</th>
                  <th>ASN</th>
                  <th>IPv4</th>
                  <th>IPv6</th>
                  <th>Ultima troca</th>
                  <th>Status</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {parentsFromApi.map((item) => (
                  <tr key={item.id}>
                    <td>{cas.find((c) => Number(c.id) === item.ca_id)?.nome ?? '-'}</td>
                    <td>{item.parent_name}</td>
                    <td>{item.service_uri || '-'}</td>
                    <td>{asnBlocks}</td>
                    <td>{ipv4Blocks}</td>
                    <td>{ipv6Blocks}</td>
                    <td>{item.last_sync_at ? new Date(item.last_sync_at).toLocaleString('pt-BR') : '-'}</td>
                    <td>
                      <div>{item.provisioning_status}</div>
                      {item.last_error && (
                        <div className="text-danger small mt-1">{item.last_error}</div>
                      )}
                    </td>
                    <td>
                      <SincronizarButton
                        type="button"
                        variant="secondary"
                        label="Atualizar"
                        disabled={syncParentResourcesMutation.isPending}
                        isPending={syncParentResourcesMutation.isPending}
                        onClick={() => {
                          if (!item.ca_id || !item.id) return;
                          syncParentResourcesMutation.mutate({
                            caId: Number(item.ca_id),
                            parentId: Number(item.id),
                          });
                        }}
                      />
                    </td>
                  </tr>
                ))}
                {parentsFromApi.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-muted">Nenhuma CA-pai configurada</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {showRepositoriosSection && (
      <div ref={repositoriosCardRef} className="card mb-3">
        <div className="card-header">Repositório (RFC 8183)</div>
        <div className="card-body">
          <p className="text-muted small mb-2">
            Gere o <code>publisher_request</code> (XML RFC 8183) e envie no fluxo do repositório (ex.: Registro.br). O{' '}
            <code>publisher_bpki_ta</code> deve ser o mesmo certificado BPKI da sua <strong>child_request</strong> já aceita
            pela CA-pai. O <code>publisher_handle</code> é normalizado para o padrão do RFC (apenas letras, dígitos,{' '}
            <code>_</code>, <code>-</code> e <code>/</code>). Na prática do Registro.br (publicação no repositório deles), o <code>publisher_request</code> precisa trazer o{' '}
            <code>&lt;referral&gt;</code> que vem no <code>parent_response</code> (RFC 8183). Sem isso o portal costuma
            responder só com &quot;erro no processamento&quot;. Após atualizar o sistema, <strong>importe de novo</strong> o
            XML da CA-pai para gravar o referral.
          </p>
          <div className="row g-2 mb-2">
            <div className="col-md-3">
              <FormField
                name="repository_ca_id"
                type="select"
                label="CA"
                size="sm"
                value={repositoryCaId}
                options={caOptions}
                onChange={(v) => {
                  setRepositoryCaId(String(v ?? ''));
                  setRepositoryReferralParentId('');
                }}
              />
            </div>
            <div className="col-md-5">
              <FormField
                name="repository_referral_parent_id"
                type="select"
                label="CA-pai (referral de publicação, se houver)"
                size="sm"
                value={repositoryReferralParentId}
                options={repositoryReferralParentOptions}
                onChange={(v) => setRepositoryReferralParentId(String(v ?? ''))}
              />
            </div>
            <div className="col-md-12">
              <FormField
                name="repository_parent_response_snippet"
                type="textarea"
                label="Opcional: XML parent_response (se o referral não foi gravado na importação)"
                size="sm"
                rows={3}
                value={repositoryParentResponseSnippet}
                onChange={(v) => setRepositoryParentResponseSnippet(String(v ?? ''))}
              />
            </div>
            <div className="col-12 d-flex align-items-end">
              <GerarButton
                type="button"
                label="Gerar Requisicao de Repositorio"
                disabled={!repositoryCaId.trim() || generatePublisherRequestMutation.isPending}
                isPending={generatePublisherRequestMutation.isPending}
                onClick={() => {
                  if (!repositoryCaId.trim()) return;
                  const caId = Number(repositoryCaId);
                  const parentId = Number(repositoryReferralParentId || 0);
                  const snippet = repositoryParentResponseSnippet.trim();
                  generatePublisherRequestMutation.mutate({
                    caId,
                    ...(parentId > 0 ? { parentId } : {}),
                    ...(snippet ? { parentResponseXml: snippet } : {}),
                  });
                }}
              />
            </div>
            <div className="col-md-12">
              <FormField
                name="repository_request_xml"
                type="textarea"
                label="publisher_request (XML)"
                size="sm"
                rows={5}
                value={repositoryRequestXml}
                onChange={(v) => setRepositoryRequestXml(String(v ?? ''))}
              />
            </div>
          </div>

          <div className="row g-2 mb-2">
            <div className="col-md-10">
              <FormField
                name="repository_response_xml"
                type="textarea"
                label="repository_response (XML)"
                size="sm"
                rows={5}
                value={repositoryResponseXml}
                onChange={(v) => setRepositoryResponseXml(String(v ?? ''))}
              />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <ConfirmarButton
                type="button"
                label="Vincular Repositorio"
                disabled={
                  !repositoryCaId.trim() ||
                  !repositoryResponseXml.trim() ||
                  importRepositoryResponseMutation.isPending
                }
                isPending={importRepositoryResponseMutation.isPending}
                onClick={() => {
                  if (!repositoryCaId.trim() || !repositoryResponseXml.trim()) return;
                  importRepositoryResponseMutation.mutate({
                    caId: Number(repositoryCaId),
                    responseXml: repositoryResponseXml.trim(),
                  });
                }}
              />
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-striped mb-0">
              <thead>
                <tr>
                  <th>publisher_handle</th>
                  <th>Publicação (service_uri)</th>
                  <th>rsync (sia_base)</th>
                  <th>RRDP</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {repositoriesFromApi.map((item: RpkiCaRepository) => (
                  <tr key={item.id}>
                    <td>{item.repository_name}</td>
                    <td className="text-break small">{item.publication_service_uri ?? '—'}</td>
                    <td className="text-break small">{item.rsync_base_uri ?? '—'}</td>
                    <td className="text-break small">{item.rrdp_notify_uri ?? '—'}</td>
                    <td>{item.publication_status}</td>
                  </tr>
                ))}
                {selectedRepoCaId > 0 && repositoriesFromApi.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted">Nenhum repositório vinculado a esta CA</td>
                  </tr>
                )}
                {selectedRepoCaId <= 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted">Selecione uma CA para listar repositórios</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}

      {showAspasSection && (
      <div ref={aspasCardRef} className="card">
        <div className="card-header">ASPAs</div>
        <div className="card-body">
          <div className="row g-2 mb-2">
            <div className="col-md-3">
              <FormField
                name="aspa_ca_id"
                type="select"
                label="CA"
                size="sm"
                value={aspaCaId}
                options={caOptions}
                onChange={(v) => setAspaCaId(String(v ?? ''))}
              />
            </div>
            <div className="col-md-3">
              <FormField name="customer_asn" label="Customer ASN" size="sm" value={customerAsn} onChange={(v) => setCustomerAsn(String(v ?? ''))} />
            </div>
            <div className="col-md-4">
              <FormField name="providers" label="Providers ASN (csv)" size="sm" value={providers} onChange={(v) => setProviders(String(v ?? ''))} />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <SalvarButton
                type="button"
                onClick={() => {
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
                }}
              />
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-striped mb-0">
              <thead>
                <tr>
                  <th>CA</th>
                  <th>Customer ASN</th>
                  <th>Providers</th>
                </tr>
              </thead>
              <tbody>
                {aspas.map((item) => (
                  <tr key={item.id}>
                    <td>{item.caNome}</td>
                    <td>{item.customerAsn}</td>
                    <td>{item.providers}</td>
                  </tr>
                ))}
                {aspas.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-muted">Nenhum ASPA configurado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default RpkiKrillConfigModal;

