import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useI18n } from '@/contexts/I18nContext';
import DraggableModal from '@/components/common/DraggableModal';
import { Button } from '@/components/ui';
import FormField from '@/components/ui/FormField';
import AddressFields from '@/components/forms/AddressFields';
import { useNotificationContext } from '@/components/notifications/NotificationProvider';
import { useFormReset } from '@/hooks/useFormReset';
import { useTableFilters } from '@/hooks/useTableFilters';
import { useAuditoria } from '@/hooks/useAuditoria';
import { saasEmpresasService, type SaasEmpresa } from '@/services/saas/saasEmpresasService';
import { saasTituloService, saasContratoService, type SaasTitulo, type SaasContrato } from '@/services/saas/saasCrudService';
import { saasTenantUsuariosService, type SaasTenantUsuario } from '@/services/saas/saasTenantUsuariosService';
import Table from '@/components/tables/Table';
import ImprimirModal from '@/components/common/ImprimirModal';
import SaasContratoFormModal from './SaasContratoFormModal';
import SaasTenantUsuarioFormModal from './SaasTenantUsuarioFormModal';
import { formatCurrency } from '@/utils/formatters';
import type { FormValue } from '@/types/common';

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

type TabId = 'dados-basicos' | 'endereco' | 'contato' | 'contratos' | 'usuarios' | 'financeiro';

const SaasEmpresaFormModal: React.FC<Props> = ({ show, onClose, onSuccess, itemId }) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const isMobile = useIsMobile();
  const auditoria = useAuditoria();
  const contratosTf = useTableFilters({ initialPage: 1, initialLimit: 500, resetPageOnFilterChange: false });
  const titulosTf = useTableFilters({ initialPage: 1, initialLimit: 500, initialSortColumn: 'id', initialSortDirection: 'desc', resetPageOnFilterChange: false });
  const usuariosTf = useTableFilters({ initialPage: 1, initialLimit: 500, initialSortColumn: 'id', initialSortDirection: 'desc', resetPageOnFilterChange: false });
  const isEditing = !!itemId;
  const [activeTab, setActiveTab] = useState<TabId>('dados-basicos');
  const [showContratoCreate, setShowContratoCreate] = useState(false);
  const [showContratoEdit, setShowContratoEdit] = useState(false);
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [showUsuarioCreate, setShowUsuarioCreate] = useState(false);
  const [showUsuarioEdit, setShowUsuarioEdit] = useState(false);
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [showInativosContratos, setShowInativosContratos] = useState(false);
  const [showCanceladosTitulos, setShowCanceladosTitulos] = useState(false);
  const [selectedTitulos, setSelectedTitulos] = useState<SaasTitulo[]>([]);
  const [showImprimirModal, setShowImprimirModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const { data } = useQuery({
    queryKey: ['saas-empresa', itemId],
    queryFn: () => saasEmpresasService.getById(itemId!),
    enabled: show && !!itemId,
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

  const createMutation = useMutation({
    mutationFn: (d: Partial<SaasEmpresa>) => saasEmpresasService.create(d),
    onSuccess: () => { success(t('messages.success')); queryClient.invalidateQueries({ queryKey: ['saas-empresas'] }); onSuccess?.(); },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('messages.error')),
  });
  const updateMutation = useMutation({
    mutationFn: (d: Partial<SaasEmpresa>) => saasEmpresasService.update(itemId!, d),
    onSuccess: () => { success(t('messages.success')); queryClient.invalidateQueries({ queryKey: ['saas-empresas'] }); onSuccess?.(); },
    onError: (e: unknown) => error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t('messages.error')),
  });
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleInputChange = (field: keyof Form, value: string) => {
    setForm(p => ({ ...p, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof Form, string>> = {};
    if (!form.razao_social.trim()) errs.razao_social = t('form.required');
    if (!form.cnpj.trim()) errs.cnpj = t('form.required');
    if (!form.email.trim()) errs.email = t('form.required');
    if (!form.responsavel_nome.trim()) errs.responsavel_nome = t('form.required');
    if (!form.responsavel_cpf.trim()) errs.responsavel_cpf = t('form.required');
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

  const empresaId = isEditing ? itemId! : null;

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

  const contratosRaw: SaasContrato[] = useMemo(() => {
    const res = contratosData?.data as { data?: SaasContrato[] } | undefined;
    return res?.data ?? [];
  }, [contratosData]);

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

  const contratosBulkActions = useMemo(() => [
    { key: 'novo', label: t('actions.create'), variant: 'primary' as const, requiresSelection: false, onClick: () => setShowContratoCreate(true) },
    { key: 'editar', label: t('actions.edit'), variant: 'primary' as const, onClick: (sel: SaasContrato[]) => { if (sel[0]) { setSelectedContratoId(sel[0].id); setShowContratoEdit(true); } } },
    { key: 'deletar', label: t('actions.delete'), onClick: handleDeleteContrato },
  ], [t, handleDeleteContrato]);

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
    { key: 'cancelar', label: t('buttons.cancel'), variant: 'primary' as const, disabled: (s: SaasTitulo[]) => {
      const items = s.length > 0 ? s : selectedTitulos;
      return items.length === 0 || items.every(i => i.status === 'pago' || i.status === 'cancelado');
    }, onClick: handleCancelarTitulo },
    { key: 'excluir', label: t('buttons.delete'), variant: 'primary' as const, disabled: (s: SaasTitulo[]) => s.length === 0, onClick: handleDeleteTitulo },
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
            <button className={`nav-link modal-tab-hover ${activeTab === 'contratos' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('contratos')} disabled={!empresaId}>{t('tabs.contracts')}</button>
          </li>
          <li className="nav-item" role="presentation">
            <button className={`nav-link modal-tab-hover ${activeTab === 'usuarios' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('usuarios')} disabled={!empresaId}>Usuários</button>
          </li>
          <li className="nav-item" role="presentation">
            <button className={`nav-link modal-tab-hover ${activeTab === 'financeiro' ? 'active' : ''}`} type="button" onClick={() => setActiveTab('financeiro')} disabled={!empresaId}>{t('tabs.financial')}</button>
          </li>
        </ul>
      </div>
    </div>
  ), [activeTab, isMobile, isPending, empresaId, onClose, t]);

  return (
    <DraggableModal show={show} onClose={onClose} title={isEditing ? `${t('actions.edit')} ${t('modal.clientsTenants')}` : `${t('actions.create')} ${t('modal.clientsTenants')}`} size="xl" modalId="saas-empresa-form" headerActions={headerActionsContent}>
      <form id="saas-empresa-form-id" onSubmit={handleSubmit}>
        <div className="cliente-modal-content">
          <div className={`tab-content cliente-tab-content ${(activeTab === 'financeiro' || activeTab === 'contratos' || activeTab === 'usuarios') ? 'cliente-tab-content-scrollable' : 'cliente-tab-content-padded'}`} id="saas-empresa-tab-content">
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
                <FormField name="responsavel_cpf" type="text" label={`${t('form.cpf')} ${t('tabs.responsible')} *`} value={form.responsavel_cpf}
                  onChange={v => handleInputChange('responsavel_cpf', String(v ?? ''))} required size="md" error={errors.responsavel_cpf} />
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
                  title={t('nav.contracts')}
                  syncWithHeader={false}
                  config={{
                    columns: [
                      { key: 'id', label: t('table.id'), sortable: true, searchable: true, width: 42, resizable: true, render: (i: SaasContrato) => i.id },
                      { key: 'plano', label: t('form.plan'), sortable: true, searchable: true, render: (i: SaasContrato) => i.plano?.nome ?? '—' },
                      { key: 'banco', label: t('menu.banks'), sortable: true, searchable: true, render: (i: SaasContrato) => i.banco?.nome || i.banco?.banco || '—' },
                      { key: 'data_inicio', label: t('form.startDate'), sortable: true, searchable: false, render: (i: SaasContrato) => new Date(i.data_inicio).toLocaleDateString('pt-BR') },
                      { key: 'data_fim', label: t('form.endDate'), sortable: true, searchable: false, render: (i: SaasContrato) => i.data_fim ? new Date(i.data_fim).toLocaleDateString('pt-BR') : '—' },
                      { key: 'valor', label: t('form.value'), sortable: true, searchable: false, render: (i: SaasContrato) => formatCurrency(i.valor ?? 0) },
                      { key: 'status', label: t('table.status'), sortable: true, searchable: true, badgeLabels: [t('status.active'), t('status.inactive')], render: (i: SaasContrato) => <span className={`badge bg-${i.status === 'ativo' ? 'success' : 'secondary'}`}>{i.status === 'ativo' ? t('status.active') : t('status.inactive')}</span> },
                    ],
                    data: contratos,
                    loading: !contratosData,
                    emptyMessage: t('empty.noContracts'),
                    searchable: true,
                    searchPlaceholder: '',
                    searchFields: [
                      { key: 'id', label: t('table.id') },
                      { key: 'plano', label: t('form.plan') },
                      { key: 'banco', label: t('menu.banks') },
                      { key: 'status', label: t('table.status') },
                      { key: 'valor', label: t('form.value') },
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
                      disabled: a.disabled,
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

          </div>
        </div>
      </form>
      <SaasContratoFormModal show={showContratoCreate} onClose={() => setShowContratoCreate(false)} empresaId={empresaId!} onSuccess={() => refetchContratos()} />
      <SaasContratoFormModal show={showContratoEdit && !!selectedContratoId} onClose={() => { setShowContratoEdit(false); setSelectedContratoId(null); }} itemId={selectedContratoId} empresaId={empresaId!} onSuccess={() => refetchContratos()} />
      <SaasTenantUsuarioFormModal show={showUsuarioCreate} onClose={() => setShowUsuarioCreate(false)} empresaId={empresaId!} onSuccess={() => refetchUsuarios()} />
      <SaasTenantUsuarioFormModal show={showUsuarioEdit && !!selectedUsuarioId} onClose={() => { setShowUsuarioEdit(false); setSelectedUsuarioId(null); }} usuarioId={selectedUsuarioId} empresaId={empresaId!} onSuccess={() => refetchUsuarios()} />
      <ImprimirModal
        show={showImprimirModal}
        onClose={() => { setShowImprimirModal(false); clearPdfUrl(); }}
        pdfUrl={pdfUrl}
        isGenerating={isGeneratingPdf}
        title={t('financial.viewDocument')}
        modalId="saas-empresa-imprimir-modal"
      />
    </DraggableModal>
  );
};

export default SaasEmpresaFormModal;
