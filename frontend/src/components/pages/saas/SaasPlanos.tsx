import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { saasPlanoService, type SaasPlano } from 'services/saas/saasPlanoService';
import { useNotificationContext } from 'components/notifications/NotificationProvider';
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
  const { success, error } = useNotificationContext();
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
    onError: () => error('Erro ao remover plano'),
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
    if (!form.nome) { error('Nome é obrigatório'); return; }
    setIsPending(true);
    try {
      if (editingId) {
        await saasPlanoService.update(editingId, form);
        success('Plano atualizado com sucesso');
      } else {
        await saasPlanoService.create(form);
        success('Plano criado com sucesso');
      }
      queryClient.invalidateQueries({ queryKey: ['saas-planos'] });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Erro ao salvar plano';
      error(msg);
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
          <button type="button" className="btn btn-outline-secondary" onClick={() => refetch()}>
            Atualizar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleNew}>
            Criar Plano
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card mb-4 border-primary">
          <div className="card-header d-flex align-items-center justify-content-between">
            <h6 className="mb-0">{t('modal.editPlan')}</h6>
            <button type="button" className="btn-close" onClick={() => setShowForm(false)} />
          </div>
          <div className="card-body">
            <form onSubmit={handleSave}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Nome *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.nome || ''}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Valor Mensal (R$) *</label>
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
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="plano-ativo-form"
                      checked={form.ativo}
                      onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <label className="form-check-label" htmlFor="plano-ativo-form" style={{ cursor: 'pointer' }}>
                      {form.ativo ? 'Ativo' : 'Inativo'}
                    </label>
                  </div>
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
                <button type="submit" className="btn btn-primary" disabled={isPending}>
                  Salvar
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="row g-3">
        {isLoading ? (
          <div className="col-12 text-center py-4">
            <span className="spinner-border spinner-border-sm me-2"></span>Carregando...
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
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary flex-grow-1"
                      onClick={() => handleEdit(plano)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(plano.id, plano.nome)}
                    >
                      Excluir
                    </button>
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
