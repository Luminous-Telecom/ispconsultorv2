import React, { useState, useMemo, useLayoutEffect, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DadosEmpresaService, DadosEmpresa as DadosEmpresaType } from 'services/dadosEmpresaService';
import { saasDadosEmpresaService, type SaasDadosEmpresaItem } from 'services/saas/saasDadosEmpresaService';
import { ParametrosService } from 'services/parametrosService';
import { SaasParametrosService } from 'services/saas/saasParametrosService';
import { ClienteService } from 'services/clienteService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useI18n } from 'contexts/I18nContext';
import { useFormReset } from 'hooks/useFormReset';
import { useIsMobile } from 'hooks/useMediaQuery';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { CancelarButton, Loading, NovoButton, SalvarButton } from 'components/ui';
import { DadosEmpresaForm, DadosEmpresaModalProps } from './types';
import DadosBasicosTab from './abas/DadosBasicosTab';
import EnderecoTab from './abas/EnderecoTab';
import ContatoTab from './abas/ContatoTab';
import ResponsavelTab from './abas/ResponsavelTab';
import FinanceiroTab from './abas/FinanceiroTab';
import { isValidCNPJ } from 'utils/validators';

function toFormData(item: SaasDadosEmpresaItem): DadosEmpresaForm {
  return {
    id: item.id,
    razao_social: item.razao_social ?? item.nome_empresa ?? '',
    nome_fantasia: item.nome_fantasia ?? '',
    cnpj: item.cnpj ?? '',
    inscricao_estadual: item.inscricao_estadual ?? '',
    inscricao_municipal: item.inscricao_municipal ?? '',
    cep: item.cep ?? '',
    endereco: item.endereco ?? '',
    numero: item.numero ?? '',
    complemento: item.complemento ?? '',
    bairro: item.bairro ?? '',
    cidade: item.cidade ?? '',
    estado: item.estado ?? '',
    telefone: item.telefone ?? '',
    celular: item.celular ?? '',
    email: item.email ?? '',
    site: item.site ?? '',
    responsavel_nome: item.responsavel_nome ?? '',
    responsavel_cpf: item.responsavel_cpf ?? '',
    responsavel_cargo: item.responsavel_cargo ?? '',
    responsavel_assinatura: item.responsavel_assinatura ?? undefined,
    logo: item.logo ?? item.logo_url ?? undefined,
  };
}

function toSaasPayload(d: DadosEmpresaForm): Partial<SaasDadosEmpresaItem> {
  return {
    razao_social: d.razao_social || null,
    nome_fantasia: d.nome_fantasia || null,
    cnpj: d.cnpj || null,
    inscricao_estadual: d.inscricao_estadual || null,
    inscricao_municipal: d.inscricao_municipal || null,
    cep: d.cep || null,
    endereco: d.endereco || null,
    numero: d.numero || null,
    complemento: d.complemento || null,
    bairro: d.bairro || null,
    cidade: d.cidade || null,
    estado: d.estado || null,
    telefone: d.telefone || null,
    celular: d.celular || null,
    email: d.email,
    site: d.site || null,
    responsavel_nome: d.responsavel_nome || null,
    responsavel_cpf: d.responsavel_cpf || null,
    responsavel_cargo: d.responsavel_cargo || null,
    responsavel_assinatura: d.responsavel_assinatura || null,
    logo: d.logo || null,
  };
}

const DadosEmpresaModal: React.FC<DadosEmpresaModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  onHeaderActionsReady,
  variant = 'admin',
  itemId = null,
  onSuccess,
  modalId: propModalId,
  companyOptions,
  selectedCompanyId,
  onCompanyChange,
}) => {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const isSaas = variant === 'saas';
  const isSaasCreate = isSaas && itemId == null;
  const isSaasEdit = isSaas && itemId != null;

  const [activeTab, setActiveTab] = useState<'basico' | 'endereco' | 'contato' | 'responsavel' | 'faturas-abertas' | 'faturas-pagas'>('basico');
  const { success, info } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  const initialFormData: DadosEmpresaForm = {
    id: 1,
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    telefone: '',
    celular: '',
    email: '',
    site: '',
    responsavel_nome: '',
    responsavel_cpf: '',
    responsavel_cargo: '',
    responsavel_assinatura: undefined,
    logo: undefined,
  };

  const [dados, setDados] = useState<DadosEmpresaForm>(initialFormData);

  const { data: dadosEmpresa } = useQuery({
    queryKey: ['dados-empresa'],
    queryFn: () => DadosEmpresaService.get(),
    enabled: show && !isSaas,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: empresaRes, isLoading: isLoadingSaas } = useQuery({
    queryKey: ['saas-dados-empresa', itemId],
    queryFn: () => saasDadosEmpresaService.getById(itemId!),
    enabled: show && isSaasEdit,
  });

  const { data: parametrosAdmin } = useQuery({
    queryKey: ['parametros'],
    queryFn: () => ParametrosService.get(),
    staleTime: 60 * 1000,
    enabled: show && !isSaas
  });

  const { data: parametrosSaas } = useQuery({
    queryKey: ['saas-parametros'],
    queryFn: () => SaasParametrosService.get(),
    staleTime: 60 * 1000,
    enabled: show && isSaas
  });

  const parametros = isSaas ? parametrosSaas : parametrosAdmin;
  const lastCnpjConsulted = useRef<string>('');

  const empresaData = empresaRes?.data as SaasDadosEmpresaItem | undefined;
  const customData = isSaasEdit && empresaData ? toFormData(empresaData) : !isSaas ? dadosEmpresa : undefined;

  useFormReset({
    show,
    initialData: initialFormData,
    setFormData: setDados,
    customData,
  });

  useEffect(() => {
    if (show) lastCnpjConsulted.current = '';
  }, [show, itemId]);

  // Buscar CNPJ ao digitar 14 dígitos válidos
  useEffect(() => {
    if (!show || !parametros?.data?.validar_cpf_cnpj) return;
    const cnpjLimpo = dados.cnpj.replace(/\D/g, '');
    if (cnpjLimpo.length !== 14 || !isValidCNPJ(dados.cnpj) || lastCnpjConsulted.current === cnpjLimpo) return;
    const camposVazios = !dados.razao_social && !dados.nome_fantasia && !dados.endereco;
    if (!camposVazios) return;

    lastCnpjConsulted.current = cnpjLimpo;
    ClienteService.consultarCnpj(cnpjLimpo)
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          setDados(prev => ({
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
          showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_CNPJ_ERROR);
        }
      });
  }, [dados.cnpj, dados.razao_social, dados.nome_fantasia, dados.endereco, show, parametros?.data?.validar_cpf_cnpj, success, info, showApiError]);

  const updateAdminMutation = useMutation({
    mutationFn: (data: DadosEmpresaType) => DadosEmpresaService.update(data),
    onSuccess: () => {
      success('Dados da empresa atualizados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['dados-empresa'] });
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_DATA_UPDATE_ERROR),
  });

  const createSaasMutation = useMutation({
    mutationFn: (data: DadosEmpresaForm) => saasDadosEmpresaService.create(toSaasPayload(data)),
    onSuccess: () => {
      success('Empresa cadastrada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['saas-dados-empresa-list'] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_CREATE_ERROR),
  });

  const updateSaasMutation = useMutation({
    mutationFn: (data: DadosEmpresaForm) => saasDadosEmpresaService.update(itemId!, toSaasPayload(data)),
    onSuccess: () => {
      success('Empresa atualizada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['saas-dados-empresa-list'] });
      queryClient.invalidateQueries({ queryKey: ['saas-dados-empresa', itemId] });
      onSuccess?.();
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_UPDATE_ERROR),
  });

  const isPending = updateAdminMutation.isPending || createSaasMutation.isPending || updateSaasMutation.isPending;

  const handleInputChange = useCallback((field: keyof DadosEmpresaForm, value: string) => {
    setDados((prev) => ({ ...prev, [field]: value ?? '' }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isSaas && !dados.razao_social?.trim() && !dados.nome_fantasia?.trim()) {
        showApiError('Razão social ou nome fantasia é obrigatório');
        return;
      }
      if (!dados.email?.trim()) {
        showApiError('E-mail é obrigatório');
        return;
      }
      if (isSaasCreate) createSaasMutation.mutate(dados);
      else if (isSaasEdit) updateSaasMutation.mutate(dados);
      else updateAdminMutation.mutate(dados);
    },
    [dados, showApiError, isSaas, isSaasCreate, isSaasEdit, createSaasMutation, updateSaasMutation, updateAdminMutation]
  );

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const onLogoChange = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        if (isSaasEdit) {
          const resp = await saasDadosEmpresaService.uploadLogo(itemId!, file);
          const data = (resp as { data?: { logo?: string } }).data;
          const logo = data?.logo;
          if (logo) {
            setDados((prev) => ({ ...prev, logo }));
            success('Logo atualizada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['saas-dados-empresa', itemId] });
          }
        } else if (!isSaas) {
          const resp = await DadosEmpresaService.uploadLogo(file);
          setDados((prev) => ({ ...prev, logo: resp.logo }));
          success('Logo atualizada com sucesso!');
          queryClient.invalidateQueries({ queryKey: ['dados-empresa'] });
        } else {
          showApiError('Salve a empresa primeiro para enviar a logo');
        }
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_LOGO_ERROR);
      }
    },
    [isSaas, isSaasEdit, itemId, success, showApiError, queryClient]
  );

  const onAssinaturaChange = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        if (isSaasEdit) {
          const resp = await saasDadosEmpresaService.uploadAssinatura(itemId!, file);
          const data = (resp as { data?: { responsavel_assinatura?: string } }).data;
          const assinatura = data?.responsavel_assinatura;
          if (assinatura) {
            setDados((prev) => ({ ...prev, responsavel_assinatura: assinatura }));
            success('Assinatura atualizada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['saas-dados-empresa', itemId] });
          }
        } else if (!isSaas) {
          const resp = await DadosEmpresaService.uploadAssinatura(file);
          setDados((prev) => ({ ...prev, responsavel_assinatura: resp.responsavel_assinatura }));
          success('Assinatura atualizada com sucesso!');
          queryClient.invalidateQueries({ queryKey: ['dados-empresa'] });
        } else {
          showApiError('Salve a empresa primeiro para enviar a assinatura');
        }
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_SIGNATURE_ERROR);
      }
    },
    [isSaas, isSaasEdit, itemId, success, showApiError, queryClient]
  );

  type EmpresaTabId = 'basico' | 'endereco' | 'contato' | 'responsavel' | 'faturas-abertas' | 'faturas-pagas';

  const empresaTabs = useMemo((): ModalTabItem<EmpresaTabId>[] => {
    const tabs: ModalTabItem<EmpresaTabId>[] = [
      { id: 'basico', label: 'Empresa' },
      { id: 'endereco', label: 'Endereço' },
      { id: 'contato', label: 'Contato' },
      { id: 'responsavel', label: 'Responsável' },
    ];

    if (!isSaas) {
      tabs.push(
        { id: 'faturas-abertas', label: t('tabs.faturasAbertas') },
        { id: 'faturas-pagas', label: t('tabs.faturasPagas') },
      );
    }

    return tabs;
  }, [isSaas, t]);

  const headerActionsContent = useMemo(
    () => (
      <div className="empresa-header-unified">
        {companyOptions && companyOptions.length > 0 && onCompanyChange && (
          <div className="mb-1">
            <select
              className="form-select form-select-sm truncate-max-280"
              
              value={selectedCompanyId ?? ''}
              onChange={(e) => onCompanyChange(e.target.value ? Number(e.target.value) : null)}
            >
              {companyOptions.map((o) => (
                <option key={o.value ?? 'new'} value={o.value ?? ''}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="empresa-header-buttons modal-header-actions">
          <CancelarButton type="button" onClick={handleCancel} isPending={isPending} />
          {isSaasCreate ? (
            <NovoButton type="submit" form="empresa-form" entity="Empresa" isPending={isPending} />
          ) : (
            <SalvarButton type="submit" form="empresa-form" isPending={isPending} />
          )}
        </div>
        <div className="empresa-header-tabs">
          <ModalTabsOverflow
            tabs={empresaTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabsClassName={`empresa-tabs-unified ${isMobile ? 'empresa-tabs-mobile' : ''}`}
            isMobile={isMobile}
            id="empresaTab"
          />
        </div>
      </div>
    ),
    [activeTab, empresaTabs, isMobile, isPending, handleCancel, companyOptions, selectedCompanyId, onCompanyChange, isSaasCreate]
  );

  useLayoutEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      onHeaderActionsReady(headerActionsContent);
    }
  }, [skipWrapper, onHeaderActionsReady, headerActionsContent]);

  const modalContent = (
    <div className="empresa-modal-content">
      <div className={`tab-content empresa-tab-content empresa-tab-content-padded`} id="empresaTabContent">
        <form id="empresa-form" onSubmit={handleSubmit} className="form-modal-simple">
          {activeTab === 'basico' && <DadosBasicosTab dados={dados} onChange={handleInputChange} isPending={isPending} onLogoChange={onLogoChange} />}
          {activeTab === 'endereco' && <EnderecoTab dados={dados} onChange={handleInputChange} isPending={isPending} parametrosOverride={isSaas && parametros?.data ? { validar_cep: parametros.data.validar_cep } : undefined} />}
          {activeTab === 'contato' && <ContatoTab dados={dados} onChange={handleInputChange} isPending={isPending} />}
          {activeTab === 'responsavel' && <ResponsavelTab dados={dados} onChange={handleInputChange} isPending={isPending} onAssinaturaChange={onAssinaturaChange} />}
          {activeTab === 'faturas-abertas' && !isSaas && <FinanceiroTab empresaId={dadosEmpresa?.id} tipo="abertas" />}
          {activeTab === 'faturas-pagas' && !isSaas && <FinanceiroTab empresaId={dadosEmpresa?.id} tipo="pagas" />}
        </form>
      </div>
    </div>
  );

  if (skipWrapper) return modalContent;

  const modalId = propModalId ?? 'dados-empresa-modal';

  if (isSaasEdit && isLoadingSaas) {
    return (
      <DraggableModal show={show} onClose={onClose} title="Empresa" size="xl" modalId={modalId}>
        <Loading variant="modal" />
      </DraggableModal>
    );
  }

  return (
    <DraggableModal show={show} onClose={handleCancel} title="Empresa" size="xl" modalId={modalId} headerActions={headerActionsContent}>
      {modalContent}
    </DraggableModal>
  );
};

export default DadosEmpresaModal;
