import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { saasEmpresasService } from '@/services/saas/saasEmpresasService';
import { saasTituloService } from '@/services/saas/saasCrudService';

const SaasDashboard: React.FC = () => {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['saas-empresas-stats'],
    queryFn: () => saasEmpresasService.getStats(),
    staleTime: 0,
  });

  const { data: titulosData, isLoading: titulosLoading } = useQuery({
    queryKey: ['saas-titulos-resumo'],
    queryFn: () => saasTituloService.getResumo(),
    staleTime: 0,
  });

  const stats = statsData?.data as { total?: number; totalUsuarios?: number } | undefined;
  const fin = titulosData?.data as { titulosPendentes?: number; titulosAtrasados?: number; totalRecebido?: number; mrr?: number } | undefined;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  return (
    <div className="container-fluid p-4">
      {/* Cards de Empresas */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small">Total Tenants</span>
                <i className="bi bi-buildings text-primary fs-5"></i>
              </div>
              {statsLoading ? (
                <div className="placeholder-glow"><span className="placeholder col-6"></span></div>
              ) : (
                <h3 className="mb-0 fw-bold">{stats?.total ?? 0}</h3>
              )}
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small">Total Usuários</span>
                <i className="bi bi-people text-success fs-5"></i>
              </div>
              {statsLoading ? (
                <div className="placeholder-glow"><span className="placeholder col-6"></span></div>
              ) : (
                <h3 className="mb-0 fw-bold text-success">{stats?.totalUsuarios ?? 0}</h3>
              )}
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small">Planos Ativos</span>
                <i className="bi bi-card-list text-info fs-5"></i>
              </div>
              {statsLoading ? (
                <div className="placeholder-glow"><span className="placeholder col-6"></span></div>
              ) : (
                <h3 className="mb-0 fw-bold text-info">—</h3>
              )}
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small">Financeiro</span>
                <i className="bi bi-cash-coin text-warning fs-5"></i>
              </div>
              {titulosLoading ? (
                <div className="placeholder-glow"><span className="placeholder col-6"></span></div>
              ) : (
                <h3 className="mb-0 fw-bold text-warning">{fin?.titulosPendentes ?? 0}</h3>
              )}
              <small className="text-muted">pendentes</small>
            </div>
          </div>
        </div>
      </div>

      {/* Cards Financeiros */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small">MRR (Mês Atual)</span>
                <i className="bi bi-graph-up-arrow text-success fs-5"></i>
              </div>
              {titulosLoading ? (
                <div className="placeholder-glow"><span className="placeholder col-8"></span></div>
              ) : (
                <h4 className="mb-0 fw-bold text-success">{formatCurrency(fin?.mrr ?? 0)}</h4>
              )}
              <small className="text-muted">Receita mensal recorrente</small>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small">Títulos Pendentes</span>
                <i className="bi bi-clock-history text-warning fs-5"></i>
              </div>
              {titulosLoading ? (
                <div className="placeholder-glow"><span className="placeholder col-6"></span></div>
              ) : (
                <h3 className="mb-0 fw-bold text-warning">{fin?.titulosPendentes ?? 0}</h3>
              )}
            </div>
          </div>
        </div>

        <div className="col-6 col-md-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="text-muted small">Títulos Atrasados</span>
                <i className="bi bi-exclamation-triangle text-danger fs-5"></i>
              </div>
              {titulosLoading ? (
                <div className="placeholder-glow"><span className="placeholder col-6"></span></div>
              ) : (
                <h3 className="mb-0 fw-bold text-danger">{fin?.titulosAtrasados ?? 0}</h3>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Saldo */}
      <div className="row g-3">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="card-title text-muted mb-3">Resumo de Títulos</h6>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small">Total Recebido</span>
                <span className="fw-semibold text-success">{formatCurrency(fin?.totalRecebido ?? 0)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="small">MRR (mês atual)</span>
                <span className="fw-semibold text-success">{formatCurrency(fin?.mrr ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex flex-column justify-content-center align-items-center text-center">
              <i className="bi bi-shield-lock-fill text-warning mb-3" style={{ fontSize: '3rem' }}></i>
              <h6 className="fw-semibold mb-1">Painel Super Admin</h6>
              <p className="text-muted small mb-0">
                Gerencie todos os tenants, planos, contratos e títulos da plataforma SaaS.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaasDashboard;
