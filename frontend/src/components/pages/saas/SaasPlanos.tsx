import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saasPlanoService, type SaasPlano } from 'services/saas/saasPlanoService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
import { useApiError } from 'hooks/useApiError';
import { CONTEXT_ERROR_MESSAGES } from 'constants/ErrorMessages';
import AtivoInativoField from 'components/ui/AtivoInativoField';
import {
  CloseIconButton,
  Loading,
  RecarregarButton,
  NovoButton,
  SalvarButton,
  CancelarButton,
  EditarButton,
  DeletarButton,
  LabelWithHelp,
} from 'components/ui';
import { useI18n } from 'contexts/I18nContext';

const EMPTY_FORM: Partial<SaasPlano> = {
  nome: '',
  descricao: '',
  valor_mensal: 0,
  valor_anual: undefined,
  limite_usuarios: 5,
  ativo: true,
};

const SaasPlanos: React.FC = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { success } = useNotificationContext();
  const { showApiError } = useApiError();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<SaasPlano>>(EMPTY_FORM);
  const [isPending, setIsPending] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['saas-planos'],
    queryFn: () => saasPlanoService.list(),
    staleTime: 0,
  });

  const planos: SaasPlano[] = (data?.data as SaasPlano[] | undefined) || [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => saasPlanoService.delete(id),
    onSuccess: () => {
      success('Plano removido com sucesso');
      queryClient.invalidateQueries({ queryKey: ['saas-planos'] });
    },
    onError: (err) => showApiError(err, CONTEXT_ERROR_MESSAGES.PLANO_DELETE_ERROR),
  });

  const handleDelete = (id: number, nome: string) => {
    if (!window.confirm(`Remover o plano "${nome}"?`)) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (plano: SaasPlano) => {
    setEditingId(plano.id);
    const recursos = (plano.recursos as Record<string, unknown>) || {};
    const modulos = Array.isArray(recursos.modulos) ? recursos.modulos : [];
    setForm({
      nome: plano.nome,
      descricao: plano.descricao || '',
      valor_mensal: plano.valor_mensal,
      valor_anual: plano.valor_anual,
      limite_usuarios: plano.limite_usuarios,
      ativo: plano.ativo,
      recursos: { ...recursos, modulos },
    });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) { showApiError('Nome é obrigatório'); return; }
    setIsPending(true);
    try {
      if (editingId) {
        await saasPlanoService.update(editingId, form);
        success('Plano atualizado com sucesso');
      } else {
        await saasPlanoService.create(form);
        success('Plano salvo com sucesso');
      }
      queryClient.invalidateQueries({ queryKey: ['saas-planos'] });
    } catch (err) {
      showApiError(err, CONTEXT_ERROR_MESSAGES.PLANO_SAVE_ERROR);
    } finally {
      setIsPending(false);
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  return (
    <div className="container-fluid p-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-1 fw-bold">Planos SaaS</h4>
          <p className="text-muted mb-0 small">Gerencie os planos disponíveis na plataforma</p>
        </div>
        <div className="d-flex gap-2">
          <RecarregarButton type="button" onClick={() => refetch()} />
          <NovoButton entity="Plano" type="button" onClick={handleNew} />
        </div>
      </div>

      {showForm && (
        <div className="card mb-4 border-primary">
          <div className="card-header d-flex align-items-center justify-content-between">
            <h6 className="mb-0">{t('modal.editPlan')}</h6>
            <CloseIconButton onClick={() => setShowForm(false)} />
          </div>
          <div className="card-body">
            <form onSubmit={handleSave}>
              <div className="row g-3">
                <div className="col-md-6">
                  <LabelWithHelp className="form-label" required>
                    Nome
                  </LabelWithHelp>
                  <input
                    type="text"
                    className="form-control"
                    value={form.nome || ''}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <LabelWithHelp className="form-label" required>
                    Valor Mensal (R$)
                  </LabelWithHelp>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    step={0.01}
                    value={form.valor_mensal || 0}
                    onChange={(e) => setForm({ ...form, valor_mensal: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Valor Anual (R$)</label>
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    step={0.01}
                    value={form.valor_anual || ''}
                    onChange={(e) => setForm({ ...form, valor_anual: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Limite de Usuários</label>
                  <input
                    type="number"
                    className="form-control"
                    min={1}
                    value={form.limite_usuarios || 5}
                    onChange={(e) => setForm({ ...form, limite_usuarios: Number(e.target.value) })}
                  />
                </div>
                <div className="col-md-4">
                  <AtivoInativoField
                    value={!!form.ativo}
                    onChange={(v) => setForm({ ...form, ativo: v })}
                    disabled={isPending}
                    id="plano-ativo-form"
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">Descrição</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={form.descricao || ''}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  />
                </div>
              </div>
              <div className="d-flex gap-2 mt-3">
                <SalvarButton type="submit" disabled={isPending} isPending={isPending} />
                <CancelarButton type="button" onClick={() => setShowForm(false)} />
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="row g-3">
        {isLoading ? (
          <div className="col-12 text-center py-4">
            <Loading variant="inline" size="sm" message={t('messages.loading')} />
          </div>
        ) : planos.length === 0 ? (
          <div className="col-12 text-center py-4 text-muted">Nenhum plano cadastrado</div>
        ) : (
          planos.map((plano) => (
            <div key={plano.id} className="col-md-4">
              <div className={`card h-100 border-0 shadow-sm ${!plano.ativo ? 'opacity-50' : ''}`}>
                <div className="card-body">
                  <div className="d-flex align-items-start justify-content-between mb-2">
                    <h5 className="card-title mb-0 fw-bold">{plano.nome}</h5>
                    <span className={`badge ${plano.ativo ? 'bg-success' : 'bg-secondary'}`}>
                      {plano.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {plano.descricao && <p className="text-muted small mb-3">{plano.descricao}</p>}
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span className="small text-muted">Mensal</span>
                      <span className="fw-semibold text-primary">{formatCurrency(plano.valor_mensal)}</span>
                    </div>
                    {plano.valor_anual && (
                      <div className="d-flex justify-content-between mb-1">
                        <span className="small text-muted">Anual</span>
                        <span className="fw-semibold">{formatCurrency(plano.valor_anual)}</span>
                      </div>
                    )}
                    <div className="d-flex justify-content-between">
                      <span className="small text-muted">Usuários</span>
                      <span className="fw-semibold">{plano.limite_usuarios}</span>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <EditarButton
                      type="button"
                      size="sm"
                      className="flex-grow-1"
                      onClick={() => handleEdit(plano)}
                    />
                    <DeletarButton
                      type="button"
                      size="sm"
                      onClick={() => handleDelete(plano.id, plano.nome)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SaasPlanos;
