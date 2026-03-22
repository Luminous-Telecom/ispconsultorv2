import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from 'hooks/useMediaQuery';
import { useI18n } from 'contexts/I18nContext';
import DraggableModal from 'components/common/DraggableModal';
import { Button } from 'components/ui';
import FormField from 'components/ui/FormField';
import AddressFields from 'components/forms/AddressFields';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useFormReset } from 'hooks/useFormReset';
import { useTableFilters } from 'hooks/useTableFilters';
import { useAuditoria } from 'hooks/useAuditoria';
import { SaasParametrosService } from 'services/saas/saasParametrosService';
import { ClienteService } from 'services/clienteService';
import { saasEmpresasService, type SaasEmpresa } from 'services/saas/saasEmpresasService';
import { formatCNPJ, formatCEP } from 'utils/formatters';
import { isValidCNPJ } from 'utils/validators';
import { saasTituloService, saasContratoService, type SaasTitulo, type SaasContrato } from 'services/saas/saasCrudService';
import { saasTenantUsuariosService, type SaasTenantUsuario } from 'services/saas/saasTenantUsuariosService';
import Table from 'components/tables/Table';
import ImprimirModal from 'components/common/ImprimirModal';
import SaasContratoFormModal from './SaasContratoFormModal';
import SaasTenantUsuarioFormModal from './SaasTenantUsuarioFormModal';
import SaasTituloFormModal from './SaasTituloFormModal';
import SaasReceberModal from './SaasReceberModal';
import { formatCurrency, formatDate, formatDateTime } from 'utils/formatters';
import { auditoriaService, type AuditoriaLog } from 'services/auditoriaService';
import type { FormValue } from 'types/common';
import type { ApiResponse } from 'types';

interface Props { show: boolean; onClose: () => void; onSuccess?: () => void; itemId?: number | null; }

interface Form {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  celular: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  responsavel_nome: string;
  responsavel_cpf: string;
  responsavel_cargo: string;
  site: string;
}

const INITIAL: Form = {
  razao_social: '', nome_fantasia: '', cnpj: '', email: '', telefone: '', celular: '',
  cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  responsavel_nome: '', responsavel_cpf: '', responsavel_cargo: '', site: '',
};

type TabId = 'dados-basicos' | 'endereco' | 'contato' | 'contratos' | 'usuarios' | 'financeiro' | 'logs';

const SaasEmpresaFormModal: React.FC<Props> = ({ show, onClose, onSuccess, itemId }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success, error, info } = useNotificationContext();
  const lastCnpjConsulted = useRef<string>('');
  const lastCepConsulted = useRef<string>('');
  const isMobile = useIsMobile();
  const auditoria = useAuditoria();
  const contratosTf = useTableFilters({ initialPage: 1, initialLimit: 500, resetPageOnFilterChange: false });
  const titulosTf = useTableFilters({ initialPage: 1, initialLimit: 500, initialSortColumn: 'id', initialSortDirection: 'desc', resetPageOnFilterChange: false });
  const usuariosTf = useTableFilters({ initialPage: 1, initialLimit: 500, initialSortColumn: 'id', initialSortDirection: 'desc', resetPageOnFilterChange: false });
  const logsTf = useTableFilters({ initialPage: 1, initialLimit: 20, initialSortColumn: 'timestamp', initialSortDirection: 'desc', resetPageOnFilterChange: false });
  const [internalCreatedId, setInternalCreatedId] = useState<number | null>(null);
  const effectiveId = itemId ?? internalCreatedId;
  const isEditing = !!effectiveId;

  useEffect(() => {
    if (!show) setInternalCreatedId(null);
  }, [show]);
  const [activeTab, setActiveTab] = useState<TabId>('dados-basicos');
  const [showContratoCreate, setShowContratoCreate] = useState(false);
  const [showContratoEdit, setShowContratoEdit] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [showUsuarioCreate, setShowUsuarioCreate] = useState(false);
  const [showUsuarioEdit, setShowUsuarioEdit] = useState(false);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null);
  const [showTituloCreate, setShowTituloCreate] = useState(false);
  const [form, setForm] = useState<Form>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [showInativosContratos, setShowInativosContratos] = useState(false);
  const [showCanceladosTitulos, setShowCanceladosTitulos] = useState(false);
  const [selectedTitulos, setSelectedTitulos] = useState<SaasTitulo[]>([]);
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showReceberModal, setShowReceberModal] = useState(false);
  const [tituloReceber, setTituloReceber] = useState<SaasTitulo | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditoriaLog | null>(null);
  const [showLogDetailsModal, setShowLogDetailsModal] = useState(false);

  const { data } = useQuery({
    queryKey: ['saas-empresa', effectiveId],
    queryFn: () => saasEmpresasService.getById(effectiveId!),
    enabled: show && !!effectiveId,
  });

  const { data: parametros } = useQuery({
    queryKey: ['saas-parametros'],
    queryFn: () => SaasParametrosService.get(),
    staleTime: 60 * 1000,
    enabled: show
  });

  useFormReset({ show: show && !isEditing, initialData: INITIAL, setFormData: setForm, setErrors });
  useFormReset({
    show: show && isEditing, initialData: INITIAL, setFormData: setForm, setErrors,
    customData: data?.data ? (() => {
      const d = data.data as unknown as SaasEmpresa & { responsavel_nome?: string; responsavel_cpf?: string; responsavel_cargo?: string; site?: string };
      return {
        razao_social: d.razao_social ?? '',
        nome_fantasia: d.nome_fantasia ?? '',
        cnpj: d.cnpj ?? '',
        email: d.email ?? '',
        telefone: d.telefone ?? '',
        celular: d.celular ?? '',
        cep: d.cep ?? '',
        endereco: d.endereco ?? '',
        numero: d.numero ?? '',
        complemento: d.complemento ?? '',
        bairro: d.bairro ?? '',
        cidade: d.cidade ?? '',
        estado: d.estado ?? '',
        responsavel_nome: d.responsavel_nome ?? '',
        responsavel_cpf: d.responsavel_cpf ?? '',
        responsavel_cargo: d.responsavel_cargo ?? '',
        site: d.site ?? '',
      };
    })() : undefined,
  });

  useEffect(() => {
    if (show) setActiveTab('dados-basicos');
    else setSelectedTitulos([]);
  }, [show]);

  const formatLogAcao = useCallback((acao: string) => {
    const acoes: Record<string, string> = { create: t('audit.actions.create'), update: t('audit.actions.update'), delete: t('audit.actions.delete'), login: t('audit.actions.login'), logout: t('audit.actions.logout'), export: t('audit.actions.export'), import: t('audit.actions.import') };
    return acoes[acao] || acao;
  }, [t]);
  const getLogAcaoBadgeClass = useCallback((acao: string) => {
    const classes: Record<string, string> = { create: 'success', update: 'primary', delete: 'danger', login: 'info', logout: 'secondary', export: 'warning', import: 'warning' };
    return classes[acao] || 'secondary';
  }, []);
  const handleViewLog = useCallback((log: AuditoriaLog) => {
    setSelectedLog(log);
    setShowLogDetailsModal(true);
  }, []);

  const createMutation = useMutation({
    mutationFn: (d: Partial<SaasEmpresa>) => saasEmpresasService.create(d) as Promise<ApiResponse<SaasEmpresa>>,
    onSuccess: (res) => {
      const createdId = res?.data?.id;
      if (createdId) setInternalCreatedId(createdId);
      success(t('messages.success'));
      queryClient.invalidateQueries({ queryKey: ['saas-empresas'] });
      onSuccess?.();
    },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('messages.error')),
  });
  const updateMutation = useMutation({
    mutationFn: (d: Partial<SaasEmpresa>) => saasEmpresasService.update(effectiveId!, d),
    onSuccess: () => { success(t('messages.success')); queryClient.invalidateQueries({ queryKey: ['saas-empresas'] }); onSuccess?.(); },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('messages.error')),
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleInputChange = (field: keyof Form, value: string) => {
    let formatted = value;
    if (field === 'cnpj') formatted = formatCNPJ(value);
    if (field === 'cep') formatted = formatCEP(value);
    setForm(p => ({ ...p, [field]: formatted }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  useEffect(() => {
    if (show) {
      lastCnpjConsulted.current = '';
      lastCepConsulted.current = '';
    }
  }, [show, effectiveId]);

  // Buscar CNPJ ao digitar 14 dígitos válidos
  useEffect(() => {
    if (!show || isEditing || !parametros?.data?.validar_cpf_cnpj) return;
    const cnpjLimpo = form.cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14 || !isValidCNPJ(form.cnpj) || lastCnpjConsulted.current === cnpjLimpo) return;
    const camposVazios = !form.razao_social && !form.nome_fantasia && !form.endereco;
    if (!camposVazios) return;

    lastCnpjConsulted.current = cnpjLimpo;
    ClienteService.consultarCnpj(cnpjLimpo)
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          setForm(prev => ({
            ...prev,
            razao_social: d.razao_social || prev.razao_social,
            nome_fantasia: d.nome_fantasia || prev.nome_fantasia,
            cep: d.cep || prev.cep,
            endereco: d.endereco || prev.endereco,
            numero: d.numero || prev.numero,
            complemento: d.complemento || prev.complemento,
            bairro: d.bairro || prev.bairro,
            cidade: d.cidade || prev.cidade,
            estado: d.estado || prev.estado,
            telefone: d.telefone || prev.telefone,
            email: d.email || prev.email
          }));
          success('Dados do CNPJ preenchidos automaticamente!');
        }
      })
      .catch((err) => {
        /* Não resetar lastCnpjConsulted em erro — evita loop infinito */
        if (err?.response?.status === 404) {
          info('CNPJ não encontrado na base da Receita Federal. Você pode preencher os dados manualmente.');
        } else {
          error(err?.response?.data?.message || 'Erro ao consultar CNPJ. Tente novamente ou preencha manualmente.');
        }
      });
  }, [form.cnpj, form.razao_social, form.nome_fantasia, form.endereco, show, isEditing, parametros?.data?.validar_cpf_cnpj, success, info, error]);

  // Buscar CEP ao digitar 8 dígitos
  useEffect(() => {
    if (!show || !parametros?.data?.validar_cep) return;
    const cepLimpo = form.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8 || lastCepConsulted.current === cepLimpo) return;
    const camposVazios = !form.endereco && !form.bairro && !form.cidade && !form.estado;
    if (!camposVazios) return;

    lastCepConsulted.current = cepLimpo;
    ClienteService.buscarCep(cepLimpo)
      .then((data) => {
        if (data) {
          setForm(prev => ({
            ...prev,
            endereco: data.logradouro || prev.endereco,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            estado: data.uf || prev.estado,
            complemento: data.complemento || prev.complemento
          }));
          success('Dados do CEP preenchidos automaticamente!');
        }
      })
      .catch(() => { /* Não resetar em erro — evita loop infinito ao re-tentar o mesmo CEP */ });
  }, [form.cep, form.endereco, form.bairro, form.cidade, form.estado, show, parametros?.data?.validar_cep, success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof Form, string>> = {};
    if (!form.razao_social.trim()) errs.razao_social = t('form.required');
    if (!form.cnpj.trim()) errs.cnpj = t('form.required');
    if (!form.email.trim()) errs.email = t('form.required');
    if (!form.responsavel_nome.trim()) errs.responsavel_nome = t('form.required');
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    try {
      const payload: Record<string, unknown> = {
        razao_social: form.razao_social,
        nome_fantasia: form.nome_fantasia || null,
        cnpj: form.cnpj,
        email: form.email,
        telefone: form.telefone || null,
        celular: form.celular || null,
        cep: form.cep || '',
        endereco: form.endereco || '',
        numero: form.numero || '',
        complemento: form.complemento || null,
        bairro: form.bairro || '',
        cidade: form.cidade || '',
        estado: form.estado || '',
        responsavel_nome: form.responsavel_nome,
        responsavel_cpf: form.responsavel_cpf,
        responsavel_cargo: form.responsavel_cargo || null,
        site: form.site || null,
      };
      if (isEditing) await updateMutation.mutateAsync(payload as Partial<SaasEmpresa>);
      else await createMutation.mutateAsync(payload as Partial<SaasEmpresa>);
    } catch { /* tratado no mutation */ }
  };

  const empresaId = isEditing ? effectiveId! : null;

  const { data: titulosData, refetch: refetchTitulos } = useQuery({
    queryKey: ['saas-titulos', empresaId, titulosTf.sortColumn, titulosTf.sortDirection],
    queryFn: () => saasTituloService.list({ empresa_id: empresaId!, limit: 500, sortColumn: titulosTf.sortColumn, sortDirection: titulosTf.sortDirection }),
    enabled: !!empresaId && (activeTab === 'financeiro'),
  });

  const { data: contratosData, refetch: refetchContratos } = useQuery({
    queryKey: ['saas-contratos', empresaId, contratosTf.sortColumn, contratosTf.sortDirection],
    queryFn: () => saasContratoService.list({ empresa_id: empresaId!, limit: 500, sortColumn: contratosTf.sortColumn, sortDirection: contratosTf.sortDirection }),
    enabled: !!empresaId && (activeTab === 'contratos'),
  });

  const { data: usuariosData, refetch: refetchUsuarios } = useQuery({
    queryKey: ['saas-tenant-usuarios', empresaId, usuariosTf.sortColumn, usuariosTf.sortDirection],
    queryFn: () => saasTenantUsuariosService.list({ empresa_id: empresaId!, limit: 500, sortColumn: usuariosTf.sortColumn, sortDirection: usuariosTf.sortDirection }),
    enabled: !!empresaId && (activeTab === 'usuarios'),
  });

  const logsFilters = useMemo(() => ({
    page: logsTf.page,
    limit: logsTf.limit,
    search: logsTf.debouncedSearch || undefined,
    sortColumn: logsTf.sortColumn,
    sortDirection: logsTf.sortDirection,
    empresa_id: empresaId ?? undefined,
  }), [logsTf.page, logsTf.limit, logsTf.debouncedSearch, logsTf.sortColumn, logsTf.sortDirection, empresaId]);
  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ['auditoria', 'tenant', empresaId, logsFilters],
    queryFn: async () => {
      const res = await auditoriaService.listByTenant({ ...logsFilters, empresa_id: empresaId! });
      if (!res.success) throw new Error(res.message || 'Erro ao carregar logs');
      return res.data;
    },
    enabled: !!empresaId && (activeTab === 'logs'),
  });

  const titulosRaw: SaasTitulo[] = useMemo(() => {
    const res = titulosData?.data as { data?: SaasTitulo[] } | undefined;
    return res?.data ?? [];
  }, [titulosData]);

  const titulosParaFiltro = useMemo(() => {
    const term = (titulosTf.search || '').toLowerCase().trim();
    if (!term) return titulosRaw;
    return titulosRaw.filter((t) => {
      const id = String(t.id);
      const numero = (t.numero_titulo ?? '').toLowerCase();
      const valor = String(t.valor ?? '');
      const status = String(t.status ?? '').toLowerCase();
      const plano = (t.plano?.nome ?? '').toLowerCase();
      return id.includes(term) || numero.includes(term) || valor.includes(term) || status.includes(term) || plano.includes(term);
    });
  }, [titulosRaw, titulosTf.search]);

  const titulos: SaasTitulo[] = useMemo(() => {
    if (!showCanceladosTitulos) {
      return titulosParaFiltro.filter((t) => (t as { status?: string }).status !== 'cancelado');
    }
    return titulosParaFiltro;
  }, [titulosParaFiltro, showCanceladosTitulos]);

  const contratosRes = useMemo(() => {
    const res = contratosData?.data as { data?: SaasContrato[]; status_empresa?: { bloqueado_por_atraso: boolean; em_atraso: boolean; data_fim_desbloqueio_manual?: string | null } } | undefined;
    return { rows: res?.data ?? [], statusEmpresa: res?.status_empresa };
  }, [contratosData]);

  const contratosRaw: SaasContrato[] = contratosRes.rows;
  const statusEmpresa = contratosRes.statusEmpresa;

  const contratos: SaasContrato[] = useMemo(() => {
    let list = contratosRaw;
    if (!showInativosContratos) {
      list = list.filter((c) => c.status === 'ativo');
    }
    const term = (contratosTf.search || '').toLowerCase().trim();
    if (!term) return list;
    return list.filter((c) => {
      const plano = (c.plano?.nome ?? '').toLowerCase();
      const status = String(c.status).toLowerCase();
      const id = String(c.id);
      const valor = String(c.valor ?? '');
      return id.includes(term) || plano.includes(term) || status.includes(term) || valor.includes(term);
    });
  }, [contratosRaw, contratosTf.search, showInativosContratos]);

  const usuariosRaw: SaasTenantUsuario[] = useMemo(() => {
    const res = usuariosData?.data as { data?: SaasTenantUsuario[] | { data?: SaasTenantUsuario[] } } | undefined;
    const d = res?.data;
    const arr = Array.isArray(d) ? d : (d as { data?: SaasTenantUsuario[] } | undefined)?.data;
    return arr ?? [];
  }, [usuariosData]);

  const usuarios: SaasTenantUsuario[] = useMemo(() => {
    const term = (usuariosTf.search || '').toLowerCase().trim();
    if (!term) return usuariosRaw;
    return usuariosRaw.filter((u) => {
      const id = String(u.id);
      const nome = (u.nome ?? '').toLowerCase();
      const email = (u.email ?? '').toLowerCase();
      const role = (u.role ?? '').toLowerCase();
      return id.includes(term) || nome.includes(term) || email.includes(term) || role.includes(term);
    });
  }, [usuariosRaw, usuariosTf.search]);

  const handleDeleteUsuario = useCallback(async (sel: SaasTenantUsuario[]) => {
    const u = sel[0];
    if (!u || !window.confirm(t('messages.confirmDelete'))) return;
    try {
      await saasTenantUsuariosService.delete(u.id);
      refetchUsuarios();
      success(t('messages.success'));
    } catch {
      error(t('messages.error'));
    }
  }, [refetchUsuarios, success, error, t]);

  const usuariosBulkActions = useMemo(() => [
    { key: 'novo', label: t('actions.create'), variant: 'primary' as const, requiresSelection: false, onClick: () => setShowUsuarioCreate(true) },
    { key: 'editar', label: t('actions.edit'), variant: 'primary' as const, onClick: (sel: SaasTenantUsuario[]) => { if (sel[0]) { setSelectedUsuarioId(sel[0].id); setShowUsuarioEdit(true); } } },
    { key: 'deletar', label: t('actions.delete'), onClick: handleDeleteUsuario },
  ], [t, handleDeleteUsuario]);

  const formDataForAddress = useMemo(() => ({
    cep: form.cep, endereco: form.endereco, numero: form.numero, complemento: form.complemento,
    bairro: form.bairro, cidade: form.cidade, estado: form.estado,
  }), [form.cep, form.endereco, form.numero, form.complemento, form.bairro, form.cidade, form.estado]);

  const handleDeleteContrato = useCallback(async (sel: SaasContrato[]) => {
    const c = sel[0];
    if (!c || !window.confirm(t('messages.confirmDelete'))) return;
    try {
      await saasContratoService.delete(c.id);
      refetchContratos();
    } catch {
      error(t('messages.error'));
    }
  }, [refetchContratos, error, t]);

  const handleDesbloquearManual = useCallback(async () => {
    if (!empresaId) return;
    if (!window.confirm(t('saas.confirmManualUnblock') || 'Desbloquear empresa manualmente? Ela terá o prazo configurado para regularizar os títulos.')) return;
    try {
      const res = await saasEmpresasService.desbloquearManual(empresaId);
      const msg = (res as { message?: string })?.message ?? t('messages.success');
      success(msg);
      refetchContratos();
    } catch (e) {
      error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('messages.error'));
    }
  }, [empresaId, refetchContratos, success, error, t]);

  const contratosBulkActions = useMemo(() => {
    const base = [
      { key: 'novo', label: t('actions.create'), variant: 'primary' as const, requiresSelection: false, onClick: () => setShowContratoCreate(true) },
      { key: 'editar', label: t('actions.edit'), variant: 'primary' as const, onClick: (sel: SaasContrato[]) => { if (sel[0]) { setSelectedContratoId(sel[0].id); setShowContratoEdit(true); } } },
      { key: 'deletar', label: t('actions.delete'), onClick: handleDeleteContrato },
    ];
    if (statusEmpresa?.bloqueado_por_atraso) {
      base.push({ key: 'desbloquear', label: t('saas.manualUnblock') || 'Desbloquear manualmente', variant: 'primary' as const, requiresSelection: true, onClick: handleDesbloquearManual });
    }
    return base;
  }, [t, handleDeleteContrato, statusEmpresa?.bloqueado_por_atraso, handleDesbloquearManual]);

  const handleDeleteTitulo = useCallback(async (sel: SaasTitulo[]) => {
    const item = sel[0];
    if (!item || !window.confirm(t('messages.confirmDelete'))) return;
    try {
      await saasTituloService.delete(item.id);
      queryClient.invalidateQueries({ queryKey: ['saas-titulos', empresaId] });
      refetchTitulos();
      success(t('messages.success'));
    } catch {
      error(t('messages.error'));
    }
  }, [queryClient, empresaId, refetchTitulos, success, error, t]);

  const clearPdfUrl = useCallback(() => {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  }, [pdfUrl]);

  const openPrintModal = useCallback(() => {
    clearPdfUrl();
    setShowImprimirModal(true);
    setIsGeneratingPdf(true);
  }, [clearPdfUrl]);

  const handleCancelarTitulo = useCallback(async (sel: SaasTitulo[]) => {
    const items = sel?.length ? sel : selectedTitulos;
    if (items.length === 0) return;
    const msg = items.length === 1 ? t('messages.confirmCancelTitle') : t('messages.confirmCancelTitles', { count: items.length });
    if (!window.confirm(msg)) return;
    try {
      let okCount = 0;
      for (const item of items) {
        try {
          await saasTituloService.update(item.id, { status: 'cancelado' } as Partial<SaasTitulo>);
          okCount++;
        } catch {
          // continua
        }
      }
      queryClient.invalidateQueries({ queryKey: ['saas-titulos', empresaId] });
      refetchTitulos();
      setSelectedTitulos([]);
      if (okCount > 0) success(okCount === 1 ? t('financial.titleCanceled') : `${okCount} ${t('financial.titlesCanceled')}`);
    } catch {
      error(t('financial.errorCanceling'));
    }
  }, [selectedTitulos, queryClient, empresaId, refetchTitulos, success, error, t]);

  const handleEstornarTitulo = useCallback(async (sel: SaasTitulo[]) => {
    const item = sel?.length ? sel[0] : selectedTitulos[0];
    if (!item) return;
    const statusPago = item.status === 'pago' || item.status === 'pago_atraso' || item.status === 'parcial';
    if (!statusPago) {
      error(t('financial.canOnlyReversePaid'));
      return;
    }
    const msg = `${t('financial.titleWillReturnPending')}\n\n${t('document.title')} ${item.numero_titulo || item.id}\n${t('summary.value')} ${formatCurrency(Number(item.valor))}`;
    if (!window.confirm(msg)) return;
    try {
      await saasTituloService.update(item.id, { status: 'pendente', pago: false, data_pagamento: null, valor_pago: null } as Partial<SaasTitulo>);
      queryClient.invalidateQueries({ queryKey: ['saas-titulos', empresaId] });
      refetchTitulos();
      setSelectedTitulos([]);
      success(t('financial.titleReversed'));
    } catch (err) {
      error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('financial.errorReversing'));
    }
  }, [selectedTitulos, queryClient, empresaId, refetchTitulos, success, error, t]);

  const handleImprimirSelecionados = useCallback(async (sel?: SaasTitulo[]) => {
    const items = sel?.length ? sel : selectedTitulos;
    if (items.length === 0) {
      error(t('messages.noTitleSelected'));
      return;
    }
    const emAberto = items.filter(t => t.status === 'pendente' || t.status === 'vencido');
    if (emAberto.length === 0) {
      error(t('messages.noOpenTitlesFound'));
      return;
    }
    openPrintModal();
    try {
      const ids = emAberto.map(item => item.id);
      const pdfBlob = await saasTituloService.gerarPdfBoletosMultiplos(ids);
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      success(t('messages.successPrintSelected'));
    } catch {
      error(t('messages.errorPrintSelected'));
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [selectedTitulos, error, success, openPrintModal, t]);

  const handleImprimirTodosEmAberto = useCallback(async () => {
    const emAberto = titulosParaFiltro.filter(t => t.status === 'pendente' || t.status === 'vencido');
    if (emAberto.length === 0) {
      error(t('messages.noOpenTitlesFound'));
      return;
    }
    openPrintModal();
    try {
      const ids = emAberto.map(item => item.id);
      const pdfBlob = await saasTituloService.gerarPdfBoletosMultiplos(ids);
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setIsGeneratingPdf(false);
      success(t('messages.successPrintOpen'));
    } catch {
      error(t('messages.errorPrintOpen'));
      setShowImprimirModal(false);
      setIsGeneratingPdf(false);
    }
  }, [titulosParaFiltro, error, success, openPrintModal, t]);

  const titulosBulkActions = useMemo(() => [
    { key: 'novo', label: t('actions.create'), variant: 'primary' as const, requiresSelection: false, onClick: () => setShowTituloCreate(true) },
    { key: 'excluir', label: t('buttons.delete'), variant: 'primary' as const, disabled: (s: SaasTitulo[]) => s.length === 0, onClick: handleDeleteTitulo },
    { key: 'receber', label: t('actions.receive'), variant: 'primary' as const, disabled: (s: SaasTitulo[]) => {
      const items = s.length > 0 ? s : selectedTitulos;
      const emAberto = items.filter(i => !i.pago && (i as { status?: string }).status !== 'cancelado');
      return emAberto.length !== 1;
    }, onClick: (sel?: SaasTitulo[]) => {
      const items = sel && sel.length > 0 ? sel : selectedTitulos;
      const emAberto = items.filter(i => !i.pago && (i as { status?: string }).status !== 'cancelado');
      if (emAberto.length === 1) {
        setTituloReceber(emAberto[0]);
        setShowReceberModal(true);
      }
    } },
    { key: 'cancelar', label: t('buttons.cancel'), variant: 'primary' as const, disabled: (s: SaasTitulo[]) => {
      const items = s.length > 0 ? s : selectedTitulos;
      return items.length === 0 || items.every(i => i.status === 'pago' || i.status === 'cancelado');
    }, onClick: handleCancelarTitulo },
    { key: 'estornar', label: t('buttons.reverse'), variant: 'primary' as const, disabled: (s: SaasTitulo[]) => {
      const items = s.length > 0 ? s : selectedTitulos;
      const statusPago = (st: string) => st === 'pago' || st === 'pago_atraso' || st === 'parcial';
      return items.length === 0 || items.every(i => !statusPago(i.status || ''));
    }, onClick: handleEstornarTitulo },
    { key: 'imprimir', label: t('buttons.print'), variant: 'primary' as const, dropdown: [
      { label: t('other.selected'), action: (sel?: SaasTitulo[]) => handleImprimirSelecionados(sel) },
      { label: t('other.open'), action: () => handleImprimirTodosEmAberto() },
    ] },
  ], [selectedTitulos, handleCancelarTitulo, handleDeleteTitulo, handleEstornarTitulo, handleImprimirSelecionados, handleImprimirTodosEmAberto, t]);

  const headerActionsContent = useMemo(() => (
    <div className="cliente-header-unified">
      <div className="cliente-header-buttons modal-header-actions">
        <Button type="button" variant="primary" size="sm" onClick={onClose} disabled={isPending}>{t('buttons.cancel')}</Button>
        <Button type="submit" form="saas-empresa-form-id" variant="primary" size="sm" disabled={isPending}>{t('buttons.save')}</Button>
      </div>
      <div className="cliente-header-tabs">
        <ul
          className={`nav nav-tabs cliente-tabs-unified ${isMobile ? 'cliente-tabs-mobile' : ''}`}
          role="tablist"
          style={{ margin: 0, padding: 0, borderBottom: 'none', backgroundColor: 'transparent' }}
        >
          <li className="nav-item" role="presentation">
            <button className={`nav-link modal-tab-hover ${activeTab === 'dados-basicos' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('dados-basicos')}>{t('tabs.basicData')}</button>
          </li>
          <li className="nav-item" role="presentation">
            <button className={`nav-link modal-tab-hover ${activeTab === 'endereco' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('endereco')}>{t('tabs.address')}</button>
          </li>
          <li className="nav-item" role="presentation">
            <button className={`nav-link modal-tab-hover ${activeTab === 'contato' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('contato')}>{t('tabs.contact')}</button>
          </li>
          <li className="nav-item" role="presentation">
            <button className={`nav-link modal-tab-hover ${activeTab === 'contratos' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('contratos')} disabled={!empresaId}>{t('form.plan')}</button>
          </li>
          <li className="nav-item" role="presentation">
            <button className={`nav-link modal-tab-hover ${activeTab === 'usuarios' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('usuarios')} disabled={!empresaId}>Usuários</button>
          </li>
          <li className="nav-item" role="presentation">
            <button className={`nav-link modal-tab-hover ${activeTab === 'financeiro' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('financeiro')} disabled={!empresaId}>{t('tabs.financial')}</button>
          </li>
          <li className="nav-item" role="presentation">
            <button className={`nav-link modal-tab-hover ${activeTab === 'logs' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('logs')} disabled={!empresaId}>Logs</button>
          </li>
        </ul>
      </div>
    </div>
  ), [activeTab, isMobile, isPending, empresaId, onClose, t]);

  return (
    <DraggableModal show={show} onClose={onClose} title={t('modal.clientsTenants')} size="xl" modalId="saas-empresa-form" headerActions={headerActionsContent}>
      <form id="saas-empresa-form-id" onSubmit={handleSubmit}>
        <div className="cliente-modal-content">
          <div className={`tab-content cliente-tab-content ${(activeTab === 'financeiro' || activeTab === 'contratos' || activeTab === 'usuarios' || activeTab === 'logs') ? 'cliente-tab-content-scrollable' : 'cliente-tab-content-padded'}`} id="saas-empresa-tab-content">
          {activeTab === 'dados-basicos' && (
            <div className="row g-2 p-3">
              <div className="col-md-6">
                <FormField name="razao_social" type="text" label={`${t('company.razaoSocial')} *`} value={form.razao_social}
                  onChange={v => handleInputChange('razao_social', String(v ?? ''))} required size="md" error={errors.razao_social} />
              </div>
              <div className="col-md-6">
                <FormField name="nome_fantasia" type="text" label={t('company.nomeFantasia')} value={form.nome_fantasia}
                  onChange={v => setForm(p => ({ ...p, nome_fantasia: String(v ?? '') }))} size="md" />
              </div>
              <div className="col-md-4">
                <FormField name="cnpj" type="text" label={`${t('form.cnpj')} *`} value={form.cnpj}
                  onChange={v => handleInputChange('cnpj', String(v ?? ''))} required size="md" error={errors.cnpj} readOnly={isEditing} />
              </div>
              <div className="col-md-4">
                <FormField name="responsavel_nome" type="text" label={`${t('tabs.responsible')} *`} value={form.responsavel_nome}
                  onChange={v => handleInputChange('responsavel_nome', String(v ?? ''))} required size="md" error={errors.responsavel_nome} />
              </div>
              <div className="col-md-4">
                <FormField name="responsavel_cpf" type="text" label={`${t('form.cpf')} ${t('tabs.responsible')}`} value={form.responsavel_cpf}
                  onChange={v => handleInputChange('responsavel_cpf', String(v ?? ''))} size="md" error={errors.responsavel_cpf} />
              </div>
              <div className="col-md-6">
                <FormField name="responsavel_cargo" type="text" label={t('form.role')} value={form.responsavel_cargo}
                  onChange={v => setForm(p => ({ ...p, responsavel_cargo: String(v ?? '') }))} size="md" />
              </div>
            </div>
          )}

          {activeTab === 'endereco' && (
            <div className="p-3">
              <AddressFields
                required={false}
                size="md"
                formData={formDataForAddress as unknown as Record<string, FormValue>}
                onChange={(name: string, value: FormValue) => handleInputChange(name as keyof Form, String(value ?? ''))}
                errors={errors as Record<string, string>}
                parametrosOverride={parametros?.data ? { validar_cep: parametros.data.validar_cep } : undefined}
              />
            </div>
          )}

          {activeTab === 'contato' && (
            <div className="row g-2 p-3">
              <div className="col-md-4">
                <FormField name="email" type="email" label={`${t('form.email')} *`} value={form.email}
                  onChange={v => handleInputChange('email', String(v ?? ''))} required size="md" error={errors.email} />
              </div>
              <div className="col-md-4">
                <FormField name="telefone" type="tel" label={t('form.phone')} value={form.telefone}
                  onChange={v => setForm(p => ({ ...p, telefone: String(v ?? '') }))} size="md" />
              </div>
              <div className="col-md-4">
                <FormField name="celular" type="tel" label={t('form.cell')} value={form.celular}
                  onChange={v => setForm(p => ({ ...p, celular: String(v ?? '') }))} size="md" />
              </div>
              <div className="col-md-12">
                <FormField name="site" type="url" label={t('form.site')} value={form.site}
                  onChange={v => setForm(p => ({ ...p, site: String(v ?? '') }))} size="md" />
              </div>
            </div>
          )}

          {activeTab === 'contratos' && empresaId && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <Table
                  key={`saas-contratos-${empresaId}`}
                  title={t('form.plan')}
                  syncWithHeader={false}
                  config={{
                    columns: [
                      { key: 'id', label: t('table.id'), sortable: true, searchable: true, width: 42, resizable: true, render: (i: SaasContrato) => i.id },
                      { key: 'plano', label: t('table.plan'), sortable: true, searchable: true, render: (i: SaasContrato) => i.plano?.nome ?? '—' },
                      { key: 'valor_mensal', label: t('table.planValue'), sortable: true, searchable: false, render: (i: SaasContrato) => i.plano?.valor_mensal != null ? formatCurrency(i.plano.valor_mensal) : '—' },
                      { key: 'status', label: t('form.status'), sortable: true, searchable: true, badgeLabels: [t('status.active'), t('status.inactive')], render: (i: SaasContrato) => {
                        const displayStatus = statusEmpresa?.bloqueado_por_atraso ? 'bloqueado' : statusEmpresa?.em_atraso ? 'em_atraso' : i.status === 'ativo' ? 'ativo' : 'inativo';
                        const label = displayStatus === 'bloqueado' ? t('status.blocked') : displayStatus === 'em_atraso' ? t('status.inArrears') : i.status === 'ativo' ? t('status.active') : t('status.inactive');
                        const variant = displayStatus === 'bloqueado' ? 'danger' : displayStatus === 'em_atraso' ? 'warning' : i.status === 'ativo' ? 'success' : 'secondary';
                        return <span className={`badge bg-${variant}`}>{label}</span>;
                      } },
                      { key: 'desconto_percentual', label: t('table.discountPercent'), sortable: true, searchable: true, render: () => '—' },
                      { key: 'desconto_valor', label: t('table.discountValue'), sortable: true, searchable: true, render: () => '—' },
                      { key: 'valor_final', label: t('table.finalValue'), sortable: true, searchable: true, render: (i: SaasContrato) => formatCurrency(i.valor ?? 0) },
                      { key: 'data_inicio', label: t('table.contractStartDate'), sortable: true, searchable: false, render: (i: SaasContrato) => formatDate(i.data_inicio) },
                      { key: 'data_fim', label: t('table.contractEndDate'), sortable: true, searchable: false, render: (i: SaasContrato) => i.data_fim ? formatDate(i.data_fim) : '—' },
                      { key: 'isento_mensalidade', label: t('table.exempt'), sortable: true, searchable: true, badgeLabels: [t('ui.yes'), t('ui.no')], render: () => <span className="badge bg-secondary">{t('ui.no')}</span> },
                      { key: 'dia_vencimento', label: t('table.dueDay'), sortable: true, searchable: true, render: (i: SaasContrato) => i.dia_vencimento != null ? String(i.dia_vencimento).padStart(2, '0') : '—' },
                      { key: 'banco', label: t('form.bank'), sortable: true, searchable: true, render: (i: SaasContrato) => i.banco?.nome || i.banco?.banco || '—' },
                      { key: 'created_at', label: t('table.createdAt'), sortable: true, searchable: false, render: () => '—' },
                    ],
                    data: contratos,
                    loading: !contratosData,
                    emptyMessage: t('empty.noContracts'),
                    searchable: true,
                    searchPlaceholder: '',
                    searchFields: [
                      { key: 'id', label: t('table.id') },
                      { key: 'plano', label: t('table.plan') },
                      { key: 'status', label: t('form.status') },
                      { key: 'valor_final', label: t('table.finalValue') },
                      { key: 'desconto_percentual', label: t('table.discountPercent') },
                      { key: 'desconto_valor', label: t('table.discountValue') },
                      { key: 'banco', label: t('form.bank') },
                    ],
                    sortable: true,
                    sortColumn: contratosTf.sortColumn,
                    sortDirection: contratosTf.sortDirection,
                    striped: true,
                    hover: true,
                    responsive: true,
                    selectable: true,
                    multiSelect: false,
                    bulkActions: contratosBulkActions.map(a => ({
                      key: a.key,
                      label: a.label,
                      variant: a.variant,
                      requiresSelection: (a as { requiresSelection?: boolean }).requiresSelection,
                      onClick: a.onClick,
                    })),
                    className: 'no-padding',
                    customControls: (
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="showInativosSaasContratos"
                          checked={showInativosContratos}
                          onChange={(e) => setShowInativosContratos(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <label className="form-check-label" htmlFor="showInativosSaasContratos" style={{ cursor: 'pointer' }}>
                          {t('filter.showInactive')}
                        </label>
                      </div>
                    ),
                  }}
                  onRowDoubleClick={(i: SaasContrato) => { setSelectedContratoId(i.id); setShowContratoEdit(true); }}
                  onRefresh={refetchContratos}
                  onSort={contratosTf.setSort}
                  onSearch={(s, f) => { contratosTf.setSearch(s); if (f) contratosTf.setSearchField(f); }}
                  search={contratosTf.search}
                  onAudit={(i) => auditoria.handleAudit('SaasContrato', i.id)}
                  auditEntity="SaasContrato"
                />
              </div>
              {contratosRaw.length > 0 && (
                <div className="d-flex justify-content-between align-items-center p-3 bg-light financeiro-resumo" style={{ flexShrink: 0, marginTop: isMobile ? '0.25rem' : '0.5rem', marginBottom: 0, marginLeft: isMobile ? '0.5rem' : '1rem', marginRight: isMobile ? '0.5rem' : '1rem' }}>
                  <div className="d-flex align-items-center">
                    <span className="small text-muted">{t('summary.contractSummary')}</span>
                  </div>
                  <div className="d-flex gap-4">
                    <div className="text-end">
                      <div className="small text-muted">{t('summary.totalContracts')}</div>
                      <strong>{contratosRaw.length}</strong>
                    </div>
                    <div className="text-end">
                      <div className="small text-muted">{t('summary.activeContracts')}</div>
                      <strong>{contratosRaw.filter((c) => c.status === 'ativo').length}</strong>
                    </div>
                    <div className="text-end">
                      <div className="small text-muted">{t('summary.monthlyTotalValue')}</div>
                      <strong>{formatCurrency(contratosRaw.reduce((sum, c) => sum + Number(c.valor ?? 0), 0))}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'usuarios' && empresaId && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <Table
                  key={`saas-usuarios-${empresaId}`}
                  title="Usuários"
                  syncWithHeader={false}
                  config={{
                    columns: [
                      { key: 'id', label: t('table.id'), sortable: true, searchable: true, width: 42, resizable: true, render: (i: SaasTenantUsuario) => i.id },
                      { key: 'nome', label: t('form.name'), sortable: true, searchable: true, render: (i: SaasTenantUsuario) => i.nome },
                      { key: 'email', label: t('form.email'), sortable: true, searchable: true, render: (i: SaasTenantUsuario) => i.email },
                      { key: 'role', label: t('user.profile'), sortable: true, searchable: true, render: (i: SaasTenantUsuario) => <span className="badge bg-info">{i.role === 'admin' ? t('user.admin') : t('user.user')}</span> },
                      { key: 'ativo', label: t('table.status'), sortable: true, searchable: false, render: (i: SaasTenantUsuario) => <span className={`badge ${i.ativo ? 'bg-success' : 'bg-secondary'}`}>{i.ativo ? t('status.active') : t('status.inactive')}</span> },
                    ],
                    data: usuarios,
                    loading: !usuariosData,
                    emptyMessage: 'Nenhum usuário cadastrado',
                    searchable: true,
                    searchPlaceholder: '',
                    searchFields: [
                      { key: 'id', label: t('table.id') },
                      { key: 'nome', label: t('form.name') },
                      { key: 'email', label: t('form.email') },
                      { key: 'role', label: t('user.profile') },
                    ],
                    sortable: true,
                    sortColumn: usuariosTf.sortColumn,
                    sortDirection: usuariosTf.sortDirection,
                    striped: true,
                    hover: true,
                    responsive: true,
                    selectable: true,
                    multiSelect: false,
                    bulkActions: usuariosBulkActions.map(a => ({
                      key: a.key,
                      label: a.label,
                      variant: a.variant,
                      requiresSelection: (a as { requiresSelection?: boolean }).requiresSelection,
                      onClick: a.onClick,
                    })),
                    className: 'no-padding',
                  }}
                  onRowDoubleClick={(i: SaasTenantUsuario) => { setSelectedUsuarioId(i.id); setShowUsuarioEdit(true); }}
                  onRefresh={refetchUsuarios}
                  onSort={usuariosTf.setSort}
                  onSearch={(s) => usuariosTf.setSearch(s)}
                  search={usuariosTf.search}
                />
              </div>
            </div>
          )}

          {activeTab === 'financeiro' && empresaId && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <Table
                  key={`saas-titulos-${empresaId}`}
                  title={t('tabs.financial')}
                  syncWithHeader={false}
                  config={{
                    columns: [
                      { key: 'id', label: t('table.id'), sortable: true, width: 42, resizable: true, render: (i: SaasTitulo) => i.id },
                      { key: 'numero_titulo', label: t('form.title'), sortable: true, searchable: true, render: (i: SaasTitulo) => i.numero_titulo ?? '—' },
                      { key: 'valor', label: t('form.value'), sortable: true, searchable: true, render: (i: SaasTitulo) => formatCurrency(i.valor) },
                      { key: 'data_vencimento', label: t('form.dueDate'), sortable: true, searchable: false, render: (i: SaasTitulo) => new Date(i.data_vencimento).toLocaleDateString('pt-BR') },
                      { key: 'status', label: t('table.status'), sortable: true, searchable: true, render: (i: SaasTitulo) => <span className={`badge bg-${i.pago ? 'success' : 'warning'}`}>{i.pago ? t('status.paid') : i.status}</span> },
                      { key: 'plano', label: t('form.plan'), sortable: true, searchable: true, render: (i: SaasTitulo) => i.plano?.nome ?? '—' },
                    ],
                    data: titulos,
                    loading: !titulosData,
                    emptyMessage: t('empty.noTitles'),
                    searchable: true,
                    searchPlaceholder: '',
                    searchFields: [
                      { key: 'id', label: t('table.id') },
                      { key: 'numero_titulo', label: t('table.titleNumber') },
                      { key: 'status', label: t('form.status') },
                      { key: 'valor', label: t('form.value') },
                      { key: 'plano', label: t('form.plan') },
                    ],
                    sortable: true,
                    sortColumn: titulosTf.sortColumn,
                    sortDirection: titulosTf.sortDirection,
                    striped: true,
                    hover: true,
                    responsive: true,
                    selectable: true,
                    multiSelect: true,
                    bulkActions: titulosBulkActions.map(a => ({
                      key: a.key,
                      label: a.label,
                      variant: a.variant,
                      disabled: (a as { disabled?: (s: SaasTitulo[]) => boolean }).disabled,
                      requiresSelection: (a as { requiresSelection?: boolean }).requiresSelection,
                      onClick: (a as { onClick?: (s: SaasTitulo[]) => void }).onClick,
                      dropdown: (a as { dropdown?: { label: string; action: (sel?: SaasTitulo[]) => void }[] }).dropdown,
                    })),
                    className: 'no-padding',
                    customControls: (
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="showCanceladosSaasTitulos"
                          checked={showCanceladosTitulos}
                          onChange={(e) => setShowCanceladosTitulos(e.target.checked)}
                          style={{ cursor: 'pointer' }}
                        />
                        <label className="form-check-label" htmlFor="showCanceladosSaasTitulos" style={{ cursor: 'pointer' }}>
                          {t('filter.showCanceled')}
                        </label>
                      </div>
                    ),
                  }}
                  onRefresh={refetchTitulos}
                  onSort={titulosTf.setSort}
                  onSearch={(s, f) => { titulosTf.setSearch(s); if (f) titulosTf.setSearchField(f); }}
                  search={titulosTf.search}
                  onSelectionChange={(items) => setSelectedTitulos(items as SaasTitulo[])}
                  onRowDoubleClick={(i: SaasTitulo) => {
                    if (!i.pago && (i as { status?: string }).status !== 'cancelado') {
                      setTituloReceber(i);
                      setShowReceberModal(true);
                    }
                  }}
                  onAudit={(i) => auditoria.handleAudit('SaasTitulo', i.id)}
                  auditEntity="SaasTitulo"
                />
              </div>
              {titulosParaFiltro.length > 0 && (
                <div className="d-flex justify-content-end align-items-center p-3 bg-light financeiro-resumo" style={{ flexShrink: 0, marginTop: isMobile ? '0.25rem' : '0.5rem', marginBottom: 0, marginLeft: isMobile ? '0.5rem' : '1rem', marginRight: isMobile ? '0.5rem' : '1rem' }}>
                  <div className="d-flex flex-wrap gap-2 gap-md-4 justify-content-end">
                    <div className="text-end">
                      <div className="small text-muted">{t('summary.value')}</div>
                      <strong>{formatCurrency(titulosParaFiltro.reduce((s, t) => s + Number(t.valor ?? 0), 0))}</strong>
                    </div>
                    <div className="text-end">
                      <div className="small text-muted">{t('summary.paidValue')}</div>
                      <strong>{formatCurrency(titulosParaFiltro.filter((t) => t.pago).reduce((s, t) => s + Number(t.valor ?? 0), 0))}</strong>
                    </div>
                    <div className="text-end">
                      <div className="small text-muted">{t('summary.openValue')}</div>
                      <strong>{formatCurrency(titulosParaFiltro.filter((t) => !t.pago && (t as { status?: string }).status !== 'cancelado').reduce((s, t) => s + Number(t.valor ?? 0), 0))}</strong>
                    </div>
                    <div className="text-end">
                      <div className="small text-muted">{t('summary.canceledValue')}</div>
                      <strong>{formatCurrency(titulosParaFiltro.filter((t) => (t as { status?: string }).status === 'cancelado').reduce((s, t) => s + Number(t.valor ?? 0), 0))}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && empresaId && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                <Table
                  key={`saas-logs-${empresaId}`}
                  title="Logs"
                  syncWithHeader={false}
                  config={{
                    columns: [
                      { key: 'timestamp', label: t('audit.timestamp'), sortable: true, width: 130, render: (log: AuditoriaLog) => <span className="small">{formatDateTime(log.timestamp)}</span> },
                      { key: 'acao', label: t('table.action'), sortable: true, width: 90, render: (log: AuditoriaLog) => {
                        const acoes: Record<string, string> = { create: t('audit.actions.create'), update: t('audit.actions.update'), delete: t('audit.actions.delete'), login: t('audit.actions.login'), logout: t('audit.actions.logout'), export: t('audit.actions.export'), import: t('audit.actions.import') };
                        const classes: Record<string, string> = { create: 'success', update: 'primary', delete: 'danger', login: 'info', logout: 'secondary', export: 'warning', import: 'warning' };
                        const acao = acoes[log.acao] || log.acao;
                        const cls = classes[log.acao] || 'secondary';
                        return <span className={`badge bg-${cls}`}>{acao}</span>;
                      } },
                      { key: 'entidade', label: t('audit.entity'), sortable: true, width: 130, render: (log: AuditoriaLog) => <span className="small">{log.entidade}</span> },
                      { key: 'usuario_nome', label: t('table.name'), sortable: true, width: 140, render: (log: AuditoriaLog) => <span className="small">{log.usuario_nome || '-'}</span> },
                      { key: 'usuario_email', label: t('audit.user'), sortable: true, width: 160, render: (log: AuditoriaLog) => <span className="small">{log.usuario_email || 'N/A'}</span> },
                      { key: 'ip_address', label: t('audit.ip'), sortable: true, width: 120, render: (log: AuditoriaLog) => <span className="small text-muted">{log.ip_address || '-'}</span> },
                      { key: 'empresa_nome', label: t('audit.tenant'), sortable: true, width: 140, render: (log: AuditoriaLog) => <span className="small">{log.empresa_nome || '-'}</span> },
                      { key: 'rota', label: t('audit.route'), sortable: true, render: (log: AuditoriaLog) => <span className="small text-muted">{log.rota || '-'}</span> },
                    ],
                    data: (logsData?.data as AuditoriaLog[]) ?? [],
                    loading: activeTab === 'logs' && !logsData,
                    emptyMessage: 'Nenhum log encontrado para este tenant',
                    searchable: true,
                    searchPlaceholder: 'Buscar logs...',
                    sortable: true,
                    sortColumn: logsTf.sortColumn,
                    sortDirection: logsTf.sortDirection,
                    striped: true,
                    hover: true,
                    responsive: true,
                    selectable: true,
                    multiSelect: false,
                    bulkActions: [
                      {
                        key: 'visualizar',
                        label: t('audit.viewDetails'),
                        variant: 'primary' as const,
                        disabled: (s: AuditoriaLog[]) => s.length === 0,
                        onClick: (s: AuditoriaLog[]) => { if (s[0]) handleViewLog(s[0]); },
                      },
                    ],
                    pagination: logsData?.pagination
                      ? {
                          current_page: (logsData.pagination as { current_page?: number }).current_page ?? 1,
                          last_page: (logsData.pagination as { last_page?: number }).last_page ?? 1,
                          per_page: (logsData.pagination as { per_page?: number }).per_page ?? 20,
                          total: (logsData.pagination as { total?: number }).total ?? 0,
                          from: (logsData.pagination as { from?: number }).from,
                          to: (logsData.pagination as { to?: number }).to,
                        }
                      : undefined,
                    className: 'no-padding',
                  }}
                  onRefresh={refetchLogs}
                  onSort={logsTf.setSort}
                  onSearch={(s) => logsTf.setSearch(s)}
                  search={logsTf.search}
                  onPageChange={(p) => logsTf.setPage(p)}
                  onPageSizeChange={(l) => logsTf.setLimit(l)}
                  onRowDoubleClick={(log) => handleViewLog(log)}
                />
              </div>
            </div>
          )}

          </div>
        </div>
      </form>
      <SaasContratoFormModal show={showContratoCreate} onClose={() => setShowContratoCreate(false)} empresaId={empresaId!} dataFimDesbloqueioManual={statusEmpresa?.data_fim_desbloqueio_manual} onSuccess={() => refetchContratos()} />
      <SaasContratoFormModal show={showContratoEdit && !!selectedContratoId} onClose={() => { setShowContratoEdit(false); setSelectedContratoId(null); }} itemId={selectedContratoId} empresaId={empresaId!} dataFimDesbloqueioManual={statusEmpresa?.data_fim_desbloqueio_manual} onSuccess={() => refetchContratos()} />
      <SaasTenantUsuarioFormModal show={showUsuarioCreate} onClose={() => setShowUsuarioCreate(false)} empresaId={empresaId!} onSuccess={() => refetchUsuarios()} />
      <SaasTenantUsuarioFormModal show={showUsuarioEdit && !!selectedUsuarioId} onClose={() => { setShowUsuarioEdit(false); setSelectedUsuarioId(null); }} usuarioId={selectedUsuarioId} empresaId={empresaId!} onSuccess={() => refetchUsuarios()} />
      <SaasTituloFormModal show={showTituloCreate} onClose={() => setShowTituloCreate(false)} empresaId={empresaId!} onSuccess={() => refetchTitulos()} />
      <ImprimirModal
        show={showImprimirModal}
        onClose={() => { setShowImprimirModal(false); clearPdfUrl(); }}
        pdfUrl={pdfUrl}
        isGenerating={isGeneratingPdf}
        title={t('financial.viewDocument')}
        modalId="saas-empresa-imprimir-modal"
      />
      <ImprimirModal
        show={auditoria.showPreview}
        onClose={auditoria.handleClosePreview}
        pdfUrl={auditoria.pdfUrl}
        isGenerating={auditoria.isGeneratingPdf}
        title={t('modal.auditLogs')}
        modalId="saas-empresa-audit-pdf-modal"
      />
      <SaasReceberModal
        isOpen={showReceberModal}
        onClose={() => { setShowReceberModal(false); setTituloReceber(null); }}
        titulo={tituloReceber}
        empresaNome={form.nome_fantasia || form.razao_social}
        onSuccess={() => { setShowReceberModal(false); setTituloReceber(null); refetchTitulos(); refetchContratos(); }}
      />
      {selectedLog && (
        <DraggableModal
          show={showLogDetailsModal}
          onClose={() => { setShowLogDetailsModal(false); setSelectedLog(null); }}
          title={t('audit.detailsTitle')}
          size="lg"
          modalId="saas-log-details-modal"
        >
          <div style={{ padding: '16px' }}>
            <div className="mb-3">
              <h6 className="mb-2">{t('audit.generalInfo')}</h6>
              <div className="row g-2">
                <div className="col-md-6">
                  <small className="text-muted">{t('table.action')}:</small><br />
                  <span className={`badge bg-${getLogAcaoBadgeClass(selectedLog.acao)}`}>
                    {formatLogAcao(selectedLog.acao)}
                  </span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">{t('audit.entity')}:</small><br />
                  <span>{selectedLog.entidade}</span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">{t('audit.entityId')}:</small><br />
                  <span>{selectedLog.entidade_id ?? 'N/A'}</span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">{t('audit.timestamp')}:</small><br />
                  <span>{formatDateTime(selectedLog.timestamp)}</span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">{t('audit.user')}:</small><br />
                  <span>{selectedLog.usuario_email ?? 'N/A'}</span>
                  {selectedLog.usuario_nome && <div className="text-muted small">{selectedLog.usuario_nome}</div>}
                </div>
                <div className="col-md-6">
                  <small className="text-muted">{t('audit.ip')}:</small><br />
                  <span>{selectedLog.ip_address ?? 'N/A'}</span>
                </div>
                <div className="col-md-6">
                  <small className="text-muted">{t('audit.tenant')}:</small><br />
                  <span>{selectedLog.empresa_nome ?? '-'}</span>
                </div>
                {selectedLog.rota && (
                  <div className="col-12">
                    <small className="text-muted">{t('audit.route')}:</small><br />
                    <code>{selectedLog.metodo_http ?? 'N/A'} {selectedLog.rota}</code>
                  </div>
                )}
                {selectedLog.observacoes && (
                  <div className="col-12">
                    <small className="text-muted">{t('table.observations')}:</small><br />
                    <span>{selectedLog.observacoes}</span>
                  </div>
                )}
              </div>
            </div>
            {(selectedLog.dados_anteriores || selectedLog.dados_novos) && (
              <div>
                <h6 className="mb-2">{t('audit.data')}</h6>
                <pre className="p-3 bg-light rounded small mb-0" style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {JSON.stringify(
                    selectedLog.dados_anteriores && selectedLog.dados_novos
                      ? { anterior: selectedLog.dados_anteriores, novo: selectedLog.dados_novos }
                      : selectedLog.dados_novos ?? selectedLog.dados_anteriores,
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>
        </DraggableModal>
      )}
    </DraggableModal>
  );
};

export default SaasEmpresaFormModal;
