import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEmpresas, useCreateEmpresa, useUpdateEmpresa, useDeleteEmpresa } from 'hooks/useEmpresas';
import { Empresa, CreateEmpresa } from 'types';
import { useTableFilters } from 'hooks/useTableFilters';
import Table from 'components/tables/Table';
import { TableConfig, SortDirection } from 'components/tables/types';
import DraggableModal from 'components/common/DraggableModal';
import { ParametrosService } from 'services/parametrosService';
import { ClienteService } from 'services/clienteService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import { formatCNPJ, formatCEP } from 'utils/formatters';
import { isValidCNPJ } from 'utils/validators';
import { CancelarButton, NovoButton, SalvarButton } from 'components/ui';
import { normalizeListPagination } from 'utils/pagination';

interface EmpresasModalProps {
  show: boolean;
  onClose: () => void;
  skipWrapper?: boolean;
}

const INITIAL_FORM: CreateEmpresa = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  email: '',
  telefone: '',
  celular: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  responsavel_nome: '',
  responsavel_cpf: '',
  responsavel_cargo: '',
};

const EmpresasModal: React.FC<EmpresasModalProps> = ({ show, onClose, skipWrapper = false }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateEmpresa>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateEmpresa, string>>>({});
  const { success, info } = useNotificationContext();
  const { showApiError } = useApiError();
  const lastCnpjConsulted = useRef<string>('');
  const lastCepConsulted = useRef<string>('');

  const { data: parametros } = useQuery({
    queryKey: ['parametros'],
    queryFn: () => ParametrosService.get(),
    staleTime: 60 * 1000,
    enabled: show && showForm
  });

  const tableFilters = useTableFilters({
    initialSearch: '',
    initialPage: 1,
    initialLimit: 15,
    initialSortColumn: 'id',
    initialSortDirection: 'desc',
    resetPageOnFilterChange: true,
  });

  const { data: empresasData, isLoading, refetch } = useEmpresas({
    page: tableFilters.page,
    limit: tableFilters.limit,
    search: tableFilters.debouncedSearch || undefined,
    searchField: tableFilters.searchField || undefined,
  });

  const createEmpresa = useCreateEmpresa();
  const updateEmpresa = useUpdateEmpresa();
  const deleteEmpresa = useDeleteEmpresa();

  const empresas = useMemo(() => empresasData?.data || [], [empresasData]);

  const pagination = useMemo(
    () =>
      normalizeListPagination(
        (empresasData as { pagination?: Record<string, unknown> })?.pagination,
        tableFilters.page,
        tableFilters.limit
      ),
    [empresasData, tableFilters.page, tableFilters.limit]
  );

  const handleOpenCreate = useCallback(() => {
    setForm(INITIAL_FORM);
    setErrors({});
    setEditingId(null);
    setShowForm(true);
  }, []);

  const handleOpenEdit = useCallback((empresa: Empresa) => {
    setForm({
      razao_social: empresa.razao_social ?? '',
      nome_fantasia: empresa.nome_fantasia ?? '',
      cnpj: empresa.cnpj ?? '',
      email: empresa.email ?? '',
      telefone: empresa.telefone ?? '',
      celular: empresa.celular ?? '',
      cep: empresa.cep ?? '',
      endereco: empresa.endereco ?? '',
      numero: empresa.numero ?? '',
      complemento: empresa.complemento ?? '',
      bairro: empresa.bairro ?? '',
      cidade: empresa.cidade ?? '',
      estado: empresa.estado ?? '',
      responsavel_nome: empresa.responsavel_nome ?? '',
      responsavel_cpf: empresa.responsavel_cpf ?? '',
      responsavel_cargo: empresa.responsavel_cargo ?? '',
    });
    setErrors({});
    setEditingId(empresa.id);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setForm(INITIAL_FORM);
    setErrors({});
  }, []);

  const handleChange = useCallback((field: keyof CreateEmpresa, value: string) => {
    let formattedValue = value;
    if (field === 'cnpj') formattedValue = formatCNPJ(value);
    if (field === 'cep') formattedValue = formatCEP(value);
    setForm(prev => ({ ...prev, [field]: formattedValue }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  }, []);

  // Buscar CNPJ ao digitar 14 dígitos válidos
  useEffect(() => {
    if (!showForm || editingId || !parametros?.data?.validar_cpf_cnpj) return;
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
          showApiError(err, CONTEXT_ERROR_MESSAGES.EMPRESA_CNPJ_ERROR);
        }
      });
  }, [form.cnpj, form.razao_social, form.nome_fantasia, form.endereco, showForm, editingId, parametros?.data?.validar_cpf_cnpj, success, info, showApiError]);

  // Buscar CEP ao digitar 8 dígitos
  useEffect(() => {
    if (!showForm || !parametros?.data?.validar_cep) return;
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
  }, [form.cep, form.endereco, form.bairro, form.cidade, form.estado, showForm, parametros?.data?.validar_cep, success]);

  useEffect(() => {
    if (showForm) {
      lastCnpjConsulted.current = '';
      lastCepConsulted.current = '';
    }
  }, [showForm, editingId]);

  const validate = useCallback((): boolean => {
    const e: Partial<Record<keyof CreateEmpresa, string>> = {};
    if (!form.razao_social.trim()) e.razao_social = 'Razão social é obrigatória';
    if (!form.cnpj.trim()) e.cnpj = 'CNPJ é obrigatório';
    if (!form.email.trim()) e.email = 'E-mail é obrigatório';
    if (!form.cep.trim()) e.cep = 'CEP é obrigatório';
    if (!form.endereco.trim()) e.endereco = 'Endereço é obrigatório';
    if (!form.numero.trim()) e.numero = 'Número é obrigatório';
    if (!form.bairro.trim()) e.bairro = 'Bairro é obrigatório';
    if (!form.cidade.trim()) e.cidade = 'Cidade é obrigatória';
    if (!form.estado.trim()) e.estado = 'Estado é obrigatório';
    if (!form.responsavel_nome.trim()) e.responsavel_nome = 'Nome do responsável é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    try {
      if (editingId) {
        await updateEmpresa.mutateAsync({ id: editingId, data: form });
      } else {
        await createEmpresa.mutateAsync(form);
      }
      handleCloseForm();
      refetch();
    } catch { /* tratado pelo mutation */ }
  }, [validate, form, editingId, createEmpresa, updateEmpresa, handleCloseForm, refetch]);

  const handleDelete = useCallback(async (empresa: Empresa) => {
    if (!window.confirm(`Excluir empresa "${empresa.razao_social}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteEmpresa.mutateAsync(empresa.id);
      refetch();
    } catch { /* tratado pelo mutation */ }
  }, [deleteEmpresa, refetch]);

  const tableConfig: TableConfig<Empresa> = useMemo(() => ({
    data: empresas,
    loading: isLoading,
    pagination,
    sortColumn: tableFilters.sortColumn,
    sortDirection: tableFilters.sortDirection,
    searchable: true,
    searchPlaceholder: '',
    searchField: tableFilters.searchField || 'razao_social',
    searchFields: [
      { key: 'id', label: 'ID' },
      { key: 'razao_social', label: 'Razão Social' },
      { key: 'nome_fantasia', label: 'Fantasia' },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'email', label: 'E-mail' },
      { key: 'cidade', label: 'Cidade' },
    ],
    emptyMessage: 'Nenhuma empresa cadastrada',
    columns: [
      { key: 'id', label: 'ID', sortable: true, render: (v) => String(v) },
      { key: 'razao_social', label: 'Razão Social', sortable: true, render: (v) => String(v) },
      { key: 'nome_fantasia', label: 'Fantasia', sortable: true, render: (v) => String(v || '-') },
      { key: 'cnpj', label: 'CNPJ', sortable: true, render: (v) => String(v) },
      { key: 'email', label: 'E-mail', sortable: true, render: (v) => String(v) },
      { key: 'cidade', label: 'Cidade', sortable: true, render: (v) => String(v || '-') },
    ],
    actions: [
      { key: 'editar', label: 'Editar', variant: 'secondary', onClick: (e: Empresa) => handleOpenEdit(e) },
      { key: 'excluir', label: 'Excluir', variant: 'danger', onClick: (e: Empresa) => handleDelete(e) },
    ],
  }), [empresas, isLoading, pagination, tableFilters.sortColumn, tableFilters.sortDirection, tableFilters.searchField, handleOpenEdit, handleDelete]);

  const isPending = createEmpresa.isPending || updateEmpresa.isPending;

  const Field = ({ label, field, required, placeholder, maxLength }: {
    label: string;
    field: keyof CreateEmpresa;
    required?: boolean;
    placeholder?: string;
    maxLength?: number;
  }) => (
    <div className="mb-2">
      <label className="form-label mb-1 small fw-semibold">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        type="text"
        className={`form-control form-control-sm ${errors[field] ? 'is-invalid' : ''}`}
        value={String(form[field] ?? '')}
        onChange={e => handleChange(field, e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
      {errors[field] && <div className="invalid-feedback">{errors[field]}</div>}
    </div>
  );

  const content = (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <NovoButton entity="Empresa" onClick={handleOpenCreate} />
      </div>

      <Table
        syncWithHeader={false}
        config={tableConfig}
        onSort={(col, dir) => tableFilters.setSort(col, dir as SortDirection)}
        onSearch={(term, field) => { tableFilters.setSearch(term); if (field) tableFilters.setSearchField(field); }}
        onSearchFieldChange={(f) => tableFilters.setSearchField(f)}
        search={tableFilters.search}
        onPageChange={tableFilters.setPage}
        onPageSizeChange={tableFilters.setLimit}
        onRefresh={refetch}
      />

      {showForm && (
        <DraggableModal
          show={showForm}
          onClose={handleCloseForm}
          title="Empresa"
          size="lg"
        >
          <div className="p-3">
            <div className="row g-2">
              <div className="col-md-8">
                <Field label="Razão Social" field="razao_social" required />
              </div>
              <div className="col-md-4">
                <Field label="Nome Fantasia" field="nome_fantasia" />
              </div>
              <div className="col-md-4">
                <Field label="CNPJ" field="cnpj" required placeholder="00.000.000/0000-00" maxLength={18} />
              </div>
              <div className="col-md-4">
                <Field label="E-mail" field="email" required />
              </div>
              <div className="col-md-2">
                <Field label="Telefone" field="telefone" />
              </div>
              <div className="col-md-2">
                <Field label="Celular" field="celular" />
              </div>
              <div className="col-md-2">
                <Field label="CEP" field="cep" required maxLength={9} />
              </div>
              <div className="col-md-6">
                <Field label="Endereço" field="endereco" required />
              </div>
              <div className="col-md-2">
                <Field label="Número" field="numero" required />
              </div>
              <div className="col-md-2">
                <Field label="Complemento" field="complemento" />
              </div>
              <div className="col-md-3">
                <Field label="Bairro" field="bairro" required />
              </div>
              <div className="col-md-4">
                <Field label="Cidade" field="cidade" required />
              </div>
              <div className="col-md-2">
                <Field label="Estado (UF)" field="estado" required maxLength={2} />
              </div>
              <div className="col-12"><hr className="my-1" /></div>
              <div className="col-md-5">
                <Field label="Responsável" field="responsavel_nome" required />
              </div>
              <div className="col-md-3">
                <Field label="CPF do Responsável" field="responsavel_cpf" maxLength={14} />
              </div>
              <div className="col-md-4">
                <Field label="Cargo" field="responsavel_cargo" />
              </div>
            </div>

            <div className="d-flex gap-2 justify-content-end mt-3">
              <CancelarButton type="button" onClick={handleCloseForm} isPending={isPending} />
              {editingId ? (
                <SalvarButton type="button" onClick={handleSubmit} isPending={isPending} />
              ) : (
                <NovoButton entity="Empresa" type="button" onClick={handleSubmit} isPending={isPending} />
              )}
            </div>
          </div>
        </DraggableModal>
      )}
    </div>
  );

  if (skipWrapper) return content;

  return (
    <DraggableModal show={show} onClose={onClose} title="Empresas">
      {content}
    </DraggableModal>
  );
};

export default EmpresasModal;
