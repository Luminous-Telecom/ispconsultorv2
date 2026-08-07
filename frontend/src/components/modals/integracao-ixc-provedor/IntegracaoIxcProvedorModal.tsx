import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from 'contexts/I18nContext';
import {
  useCreateIntegracaoIxcProvedor,
  useIntegracaoIxcProvedor,
  useUpdateIntegracaoIxcProvedor,
} from 'hooks/useIntegracaoIxcProvedor';
import { useFormReset } from 'hooks/useFormReset';
import DraggableModal from 'components/common/DraggableModal';
import { Loading, ModalFormActions } from 'components/ui';
import { getClienteRazaoSocialLabel } from 'utils/clienteDisplay';
import { ClienteService } from 'services/clienteService';
import { ContratoService } from 'services/contratoService';
import { buildNumberEntitySelectEntities } from 'utils/entitySelectUtils';
import IntegracaoIxcProvedorFormFields, {
  type IntegracaoIxcProvedorFormData,
} from './IntegracaoIxcProvedorFormFields';

const ClienteListModal = lazy(() => import('components/modals/clientes/ClienteListModal'));
const ContratoListModal = lazy(() => import('components/modals/contratos/contratoList/ContratoListModal'));

interface IntegracaoIxcProvedorModalProps {
  show: boolean;
  onClose: () => void;
  integracaoId?: number | null;
  onSuccess?: (integracaoId?: number) => void;
}

const initialForm: IntegracaoIxcProvedorFormData = {
  nome: '',
  cliente_id: 0,
  contrato_id: 0,
  api_url: '',
  api_token: '',
  ativo: false,
};

const IntegracaoIxcProvedorModal: React.FC<IntegracaoIxcProvedorModalProps> = ({
  show,
  onClose,
  integracaoId,
  onSuccess,
}) => {
  const { t } = useI18n();
  const isEdit = !!integracaoId;

  const [formData, setFormData] = useState<IntegracaoIxcProvedorFormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof IntegracaoIxcProvedorFormData, string>>>(
    {}
  );
  const [clienteNome, setClienteNome] = useState('');
  const [contratoNome, setContratoNome] = useState('');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showContratoModal, setShowContratoModal] = useState(false);

  const { data: integracaoData, isLoading: isLoadingIntegracao } = useIntegracaoIxcProvedor(
    integracaoId ?? null
  );
  const createMutation = useCreateIntegracaoIxcProvedor();
  const updateMutation = useUpdateIntegracaoIxcProvedor();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: clientesData } = useQuery({
    queryKey: ['clientes-ativos-entity-select'],
    queryFn: () => ClienteService.list({ ativo: true, limit: 500 }),
    enabled: show,
    staleTime: 60 * 1000,
  });

  const { data: contratosData } = useQuery({
    queryKey: ['contratos-cliente-entity-select', formData.cliente_id],
    queryFn: () => ContratoService.getByCliente(formData.cliente_id),
    enabled: show && formData.cliente_id > 0,
    staleTime: 60 * 1000,
  });

  const clienteEntities = useMemo(() => {
    const base = (clientesData?.data ?? []).map((cliente) => ({
      id: cliente.id,
      nome: getClienteRazaoSocialLabel(cliente),
    }));
    return buildNumberEntitySelectEntities(base, formData.cliente_id, clienteNome);
  }, [clientesData?.data, formData.cliente_id, clienteNome]);

  const contratoEntities = useMemo(() => {
    const base = (contratosData ?? []).map((contrato) => ({
      id: contrato.id,
      nome: contrato.plano?.nome_plano?.trim() || `Contrato #${contrato.id}`,
    }));
    return buildNumberEntitySelectEntities(base, formData.contrato_id, contratoNome);
  }, [contratosData, formData.contrato_id, contratoNome]);

  useFormReset({
    show,
    initialData: initialForm,
    setFormData,
    setErrors,
    customData: integracaoData
      ? {
          nome: integracaoData.nome,
          cliente_id: Number(integracaoData.cliente_id ?? 0) || 0,
          contrato_id: Number(integracaoData.contrato_id ?? 0) || 0,
          api_url: String(integracaoData.api_url ?? ''),
          api_token: '',
          ativo: !!integracaoData.ativo,
        }
      : undefined,
  });

  useEffect(() => {
    if (!show) {
      setClienteNome('');
      setContratoNome('');
      setShowClienteModal(false);
      setShowContratoModal(false);
      return;
    }
    if (!integracaoData) return;
    const nomeCliente =
      integracaoData.cliente_nome?.trim() ||
      (integracaoData.cliente
        ? getClienteRazaoSocialLabel(integracaoData.cliente)
        : '');
    if (nomeCliente) setClienteNome(nomeCliente);

    const nomeContrato =
      integracaoData.contrato_nome?.trim() ||
      (integracaoData.contrato_id ? `Contrato #${integracaoData.contrato_id}` : '');
    if (nomeContrato) setContratoNome(nomeContrato);
  }, [show, integracaoData]);

  const clearFieldError = (field: keyof IntegracaoIxcProvedorFormData) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleChange = (
    field: keyof IntegracaoIxcProvedorFormData,
    value: string | boolean | number
  ) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'cliente_id' && Number(value) !== prev.cliente_id) {
        next.contrato_id = 0;
      }
      return next;
    });
    if (field === 'cliente_id') {
      if (!value) setClienteNome('');
      setContratoNome('');
      clearFieldError('contrato_id');
    }
    if (field === 'contrato_id' && !value) {
      setContratoNome('');
    }
    clearFieldError(field);
  };

  const applyClienteFromContrato = async (
    clienteId: number,
    clienteFromContrato?: {
      id: number;
      razao_social?: string | null;
      nome_fantasia?: string | null;
    } | null
  ) => {
    setFormData((prev) => ({ ...prev, cliente_id: clienteId }));
    clearFieldError('cliente_id');

    if (clienteFromContrato) {
      setClienteNome(getClienteRazaoSocialLabel(clienteFromContrato));
      return;
    }

    try {
      const cliente = await ClienteService.getById(clienteId);
      setClienteNome(getClienteRazaoSocialLabel(cliente));
    } catch {
      setClienteNome(`Cliente #${clienteId}`);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof IntegracaoIxcProvedorFormData, string>> = {};
    if (!formData.cliente_id) {
      newErrors.cliente_id = t('messages.clientRequired');
    }
    if (!formData.contrato_id) {
      newErrors.contrato_id = 'Contrato é obrigatório';
    }
    if (!formData.nome.trim()) {
      newErrors.nome = t('messages.nameRequired');
    }
    if (formData.ativo && !formData.api_url.trim()) {
      newErrors.api_url = 'Informe a URL da API do IXC';
    }
    if (formData.ativo && !integracaoData?.has_api_token && !formData.api_token.trim()) {
      newErrors.api_token = 'Informe o token da API do IXC';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      nome: formData.nome.trim(),
      cliente_id: formData.cliente_id,
      contrato_id: formData.contrato_id,
      api_url: formData.api_url.trim(),
      ativo: formData.ativo,
      ...(formData.api_token.trim() ? { api_token: formData.api_token.trim() } : {}),
    };

    try {
      if (isEdit && integracaoId) {
        await updateMutation.mutateAsync({ id: integracaoId, data: payload });
        onSuccess?.();
      } else {
        const created = await createMutation.mutateAsync(payload);
        onSuccess?.(created.id);
      }
    } catch {
      // Erro tratado pelo hook
    }
  };

  return (
    <>
      <DraggableModal
        show={show}
        onClose={onClose}
        title="IXC Provedor"
        size="md"
        modalId="integracao-ixc-provedor-modal"
        headerActions={
          !(isEdit && isLoadingIntegracao) ? (
            <ModalFormActions
              onCancel={onClose}
              formId="integracao-ixc-provedor-form"
              isPending={isPending}
            />
          ) : undefined
        }
      >
        {isLoadingIntegracao && isEdit ? (
          <Loading variant="modal" />
        ) : (
          <form
            id="integracao-ixc-provedor-form"
            onSubmit={handleSubmit}
            className="form-modal-simple"
          >
            <IntegracaoIxcProvedorFormFields
              form={formData}
              errors={errors}
              onChange={handleChange}
              disabled={isPending}
              hasApiToken={!!integracaoData?.has_api_token}
              clienteEntities={clienteEntities}
              contratoEntities={contratoEntities}
              onShowClienteModal={() => setShowClienteModal(true)}
              onShowContratoModal={() => setShowContratoModal(true)}
            />
          </form>
        )}
      </DraggableModal>

      {showClienteModal ? (
        <Suspense fallback={null}>
          <ClienteListModal
            show={showClienteModal}
            onClose={() => setShowClienteModal(false)}
            onSelectClient={(cliente) => {
              handleChange('cliente_id', cliente.id);
              setClienteNome(getClienteRazaoSocialLabel(cliente));
              setShowClienteModal(false);
            }}
          />
        </Suspense>
      ) : null}

      {showContratoModal ? (
        <Suspense fallback={null}>
          <ContratoListModal
            show={showContratoModal}
            onClose={() => setShowContratoModal(false)}
            initialFilters={
              formData.cliente_id > 0 ? { cliente_id: formData.cliente_id } : undefined
            }
            onSelectContrato={(contrato) => {
              const planoNome = contrato.plano?.nome_plano?.trim();
              setFormData((prev) => ({
                ...prev,
                contrato_id: contrato.id,
                ...(contrato.cliente_id ? { cliente_id: contrato.cliente_id } : {}),
              }));
              setContratoNome(planoNome || `Contrato #${contrato.id}`);
              clearFieldError('contrato_id');
              setShowContratoModal(false);

              if (contrato.cliente_id) {
                void applyClienteFromContrato(contrato.cliente_id, contrato.cliente ?? null);
              }
            }}
          />
        </Suspense>
      ) : null}
    </>
  );
};

export default IntegracaoIxcProvedorModal;
