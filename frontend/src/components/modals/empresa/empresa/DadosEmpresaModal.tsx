import React, { useState, useMemo, useLayoutEffect, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DadosEmpresaService, DadosEmpresa as DadosEmpresaType } from 'services/dadosEmpresaService';
import { authService } from 'services/authService';
import { ParametrosService } from 'services/parametrosService';
import { ClienteService } from 'services/clienteService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { useFormReset } from 'hooks/useFormReset';
import { useIsMobile } from 'hooks/useMediaQuery';
import DraggableModal from 'components/common/DraggableModal';
import ModalTabsOverflow, { ModalTabItem } from 'components/common/ModalTabsOverflow';
import { CancelarButton, SalvarButton } from 'components/ui';
import { DadosEmpresaForm, DadosEmpresaModalProps } from './types';
import DadosBasicosTab from './abas/DadosBasicosTab';
import EnderecoTab from './abas/EnderecoTab';
import ContatoTab from './abas/ContatoTab';
import ResponsavelTab from './abas/ResponsavelTab';
import { isNumericCnpj, isValidCNPJ, stripCnpj } from 'utils/validators';

const DadosEmpresaModal: React.FC<DadosEmpresaModalProps> = ({
  show,
  onClose,
  skipWrapper = false,
  onHeaderActionsReady,
  variant = 'admin',
  itemId = null,
  onSuccess: _onSuccess,
  modalId: propModalId,
  companyOptions,
  selectedCompanyId,
  onCompanyChange,
}) => {
  const isMobile = useIsMobile();
  void variant;
  void itemId;

  const [activeTab, setActiveTab] = useState<'basico' | 'endereco' | 'contato' | 'responsavel'>('basico');
  const { success, info } = useNotificationContext();
  const { showApiError } = useApiError();
  const queryClient = useQueryClient();

  const initialFormData: DadosEmpresaForm = {
    id: 0,
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
    queryFn: async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        const empresaId = currentUser.data?.empresa_id ?? undefined;
        return DadosEmpresaService.get(empresaId);
      } catch {
        return DadosEmpresaService.get();
      }
    },
    enabled: show,
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: parametros } = useQuery({
    queryKey: ['parametros'],
    queryFn: () => ParametrosService.get(),
    staleTime: 60 * 1000,
    enabled: show,
  });
  const lastCnpjConsulted = useRef<string>('');

  const customData = dadosEmpresa;

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
    const cnpjLimpo = stripCnpj(dados.cnpj);
    if (!isNumericCnpj(cnpjLimpo) || !isValidCNPJ(dados.cnpj) || lastCnpjConsulted.current === cnpjLimpo) return;
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

  const isPending = updateAdminMutation.isPending;

  const handleInputChange = useCallback((field: keyof DadosEmpresaForm, value: string) => {
    setDados((prev) => ({ ...prev, [field]: value ?? '' }));
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!dados.email?.trim()) {
        showApiError('E-mail é obrigatório');
        return;
      }
      updateAdminMutation.mutate(dados);
    },
    [dados, showApiError, updateAdminMutation]
  );

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const onLogoChange = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const empresaId = dados.id > 0 ? dados.id : undefined;
        const resp = await DadosEmpresaService.uploadLogo(file, empresaId);
        setDados((prev) => ({ ...prev, logo: resp.logo }));
        success('Logo atualizada com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['dados-empresa'] });
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_LOGO_ERROR);
      }
    },
    [dados.id, success, showApiError, queryClient]
  );

  const onAssinaturaChange = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        const empresaId = dados.id > 0 ? dados.id : undefined;
        const resp = await DadosEmpresaService.uploadAssinatura(file, empresaId);
        setDados((prev) => ({ ...prev, responsavel_assinatura: resp.responsavel_assinatura }));
        success('Assinatura atualizada com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['dados-empresa'] });
      } catch (err) {
        showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_SIGNATURE_ERROR);
      }
    },
    [dados.id, success, showApiError, queryClient]
  );

  type EmpresaTabId = 'basico' | 'endereco' | 'contato' | 'responsavel';

  const empresaTabs = useMemo((): ModalTabItem<EmpresaTabId>[] => [
    { id: 'basico', label: 'Empresa' },
    { id: 'endereco', label: 'Endereço' },
    { id: 'contato', label: 'Contato' },
    { id: 'responsavel', label: 'Responsável' },
  ], []);

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
          <SalvarButton type="submit" form="empresa-form" isPending={isPending} />
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
    [activeTab, empresaTabs, isMobile, isPending, handleCancel, companyOptions, selectedCompanyId, onCompanyChange]
  );

  useLayoutEffect(() => {
    if (skipWrapper && onHeaderActionsReady) {
      onHeaderActionsReady(headerActionsContent);
    }
  }, [skipWrapper, onHeaderActionsReady, headerActionsContent]);

  const modalContent = (
    <div className="empresa-modal-content">
      <div className="tab-content empresa-tab-content empresa-tab-content-padded" id="empresaTabContent">
        <form id="empresa-form" onSubmit={handleSubmit} className="form-modal-simple">
          {activeTab === 'basico' && <DadosBasicosTab dados={dados} onChange={handleInputChange} isPending={isPending} onLogoChange={onLogoChange} />}
          {activeTab === 'endereco' && <EnderecoTab dados={dados} onChange={handleInputChange} isPending={isPending} />}
          {activeTab === 'contato' && <ContatoTab dados={dados} onChange={handleInputChange} isPending={isPending} />}
          {activeTab === 'responsavel' && <ResponsavelTab dados={dados} onChange={handleInputChange} isPending={isPending} onAssinaturaChange={onAssinaturaChange} />}
        </form>
      </div>
    </div>
  );

  if (skipWrapper) return modalContent;

  const modalId = propModalId ?? 'dados-empresa-modal';

  return (
    <DraggableModal show={show} onClose={handleCancel} title="Empresa" size="xl" modalId={modalId} headerActions={headerActionsContent}>
      {modalContent}
    </DraggableModal>
  );
};

export default DadosEmpresaModal;
