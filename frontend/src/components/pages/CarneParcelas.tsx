import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CarneParcelaService } from '../../services/carneParcelaService';
import { CarneService } from '../../services/carneService';
import { getApiUrl } from '../../config/api';
import { useNotificationContext } from '../../contexts/NotificationContext';
import DataTable from '../common/DataTable';

const CarneParcelas: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { carneId: carneIdParam } = useParams<{ carneId: string }>();
  const carneIdFromParams = searchParams.get('carne_id');
  const carneId = carneIdParam || carneIdFromParams;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [isRegistering, setIsRegistering] = useState(false);
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();

  // Estados para controlar itens ocultos nos gráficos
  const [hiddenStatus, setHiddenStatus] = useState<Set<number>>(new Set());
  const [hiddenValores, setHiddenValores] = useState<Set<number>>(new Set());

  // Funções de toggle para os gráficos
  const toggleStatus = (index: number) => {
    const newHidden = new Set(hiddenStatus);
    if (newHidden.has(index)) newHidden.delete(index);
    else newHidden.add(index);
    setHiddenStatus(newHidden);
  };

  const toggleValores = (index: number) => {
    const newHidden = new Set(hiddenValores);
    if (newHidden.has(index)) newHidden.delete(index);
    else newHidden.add(index);
    setHiddenValores(newHidden);
  };

  // Função para renderizar gráfico de pizza (igual ao dashboard)
  const renderPieChart = (data: any[], title: string, hiddenItems: Set<number>, onToggleItem: (index: number) => void) => {
    const visibleData = data.filter((_, index) => !hiddenItems.has(index));
    const total = visibleData.reduce((sum, item) => sum + item.value, 0);
    
    // Construir o conic-gradient com todas as fatias
    let currentAngle = 0;
    const gradientStops = visibleData.map(item => {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const startAngle = currentAngle;
      const endAngle = currentAngle + (percentage * 3.6);
      currentAngle = endAngle;
      
      return `${item.color} ${startAngle}deg ${endAngle}deg`;
    }).join(', ');
    
    return (
      <div className="chart-container">
        <h6 className="chart-title">{title}</h6>
        <div className="d-flex align-items-center">
          <div className="pie-chart">
            <div className="pie-slice" style={{
              background: `conic-gradient(${gradientStops})`
            }}>
              <div className="pie-center">
                <span className="pie-total">
                  {title === 'Taxa de Pagamento' ? `${total.toFixed(1)}%` : 
                   title.includes('Valores por Status') ? `R$ ${total.toFixed(2).replace('.', ',')}` : 
                   total}
                </span>
              </div>
            </div>
          </div>
          <div className="chart-legend">
            {data.map((item, index) => (
              <div 
                key={index} 
                className="legend-item" 
                style={{ 
                  cursor: 'pointer',
                  opacity: hiddenItems.has(index) ? 0.5 : 1,
                  textDecoration: hiddenItems.has(index) ? 'line-through' : 'none'
                }}
                onClick={() => onToggleItem(index)}
              >
                <div className="legend-color" style={{ backgroundColor: item.color }}></div>
                <span className="legend-label">
                  {item.label}: {title === 'Taxa de Pagamento' ? `${item.value.toFixed(1)}%` : 
                               title.includes('Valores por Status') ? `R$ ${item.value.toFixed(2).replace('.', ',')}` : 
                               item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Buscar parcelas
  const { data: parcelasData, isLoading } = useQuery({
    queryKey: ['carne-parcelas', carneId, search, status, page, limit],
    queryFn: () => CarneParcelaService.list({ 
      carne_id: carneId ? Number(carneId) : undefined, 
      search, 
      status,
      page,
      limit
    }),
    enabled: !!carneId,
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: false
  });

  // Buscar informações do carnê
  const { data: carneData } = useQuery({
    queryKey: ['carne', carneId],
    queryFn: () => CarneService.getById(Number(carneId)),
    enabled: !!carneId,
    staleTime: 30000,
    refetchOnWindowFocus: false
  });

  // Mutação para marcar como pago
  const marcarPagoMutation = useMutation({
    mutationFn: (id: number) => CarneParcelaService.marcarPago(id),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas', carneId] });
      queryClient.invalidateQueries({ queryKey: ['carne', carneId] });
      
      // Mostrar notificação de sucesso com mensagem da API
      if (response?.message) {
        success(response.message);
      } else {
        success('Parcela marcada como paga com sucesso!');
      }
      
      // Verificar se foi gerado novo carnê automaticamente
      if (response?.novo_carne_gerado) {
        success(`Novo carnê ${response.novo_carne_gerado.numero_carne} gerado automaticamente!`);
      }
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao marcar parcela como paga');
    }
  });


  const parcelas = parcelasData?.data || [];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pago': return 'bg-success';
      case 'pendente': return 'bg-warning';
      case 'vencido': return 'bg-danger';
      case 'cancelado': return 'bg-secondary';
      case 'registrado': return 'bg-info';
      case 'ativo': return 'bg-primary';
      case 'parcial': return 'bg-warning';
      default: return 'bg-secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pago': return 'Pago';
      case 'pendente': return 'Pendente';
      case 'vencido': return 'Vencido';
      case 'cancelado': return 'Cancelado';
      case 'registrado': return 'Registrado';
      case 'ativo': return 'Ativo';
      case 'parcial': return 'Parcial';
      default: return status;
    }
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    // A query será refeita automaticamente devido ao queryKey
  };

  const handleMarcarPago = (parcelaId: number) => {
    if (window.confirm('Deseja marcar esta parcela como paga?')) {
      marcarPagoMutation.mutate(parcelaId);
    }
  };


  const handleRegistrarNoBanco = async () => {
    if (!carneData) {
      error('Carnê não encontrado');
      return;
    }

    if (carneData.carnet_id) {
      error('Carnê já está registrado no banco');
      return;
    }

    if (!carneData.banco || carneData.banco.tipo_banco !== 'efi') {
      error('Apenas carnês EFI podem ser registrados no banco');
      return;
    }

    if (!window.confirm('Deseja registrar este carnê no banco? Esta ação enviará os dados para a EFI.')) {
      return;
    }

    setIsRegistering(true);
    try {
      // Chamar a API para registrar no banco
      const response = await CarneService.registrarNoBanco(Number(carneId));
      
      // Mostrar notificação de sucesso com mensagem da API
      if (response?.message) {
        success(response.message);
      } else {
        success('Carnê registrado no banco com sucesso!');
      }
      
      queryClient.invalidateQueries({ queryKey: ['carne', carneId] });
      queryClient.invalidateQueries({ queryKey: ['carne-parcelas', carneId] });
    } catch (err: any) {
      error(err.response?.data?.message || 'Erro ao registrar carnê no banco');
    } finally {
      setIsRegistering(false);
    }
  };

  // Calcular estatísticas
  const totalParcelas = parcelas.length;
  const parcelasPagas = parcelas.filter((p: any) => p.status === 'pago').length;
  const parcelasVencidas = parcelas.filter((p: any) => p.status === 'vencido').length;
  const valorPago = parcelas.filter((p: any) => p.status === 'pago').reduce((sum: number, p: any) => sum + parseFloat(p.valor_parcela), 0);

  // Definição das colunas da tabela
  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (parcela: any) => <code className="text-primary">#{parcela.id}</code>
    },
    {
      key: 'charge_id',
      label: 'Charge ID',
      render: (parcela: any) => (
        <code className="text-info">
          {parcela.charge_id || 'Não gerado'}
        </code>
      )
    },
    {
      key: 'numero_parcela',
      label: 'Parcela',
      render: (parcela: any) => <strong>#{parcela.numero_parcela}</strong>
    },
    {
      key: 'valor_parcela',
      label: 'Valor',
      render: (parcela: any) => (
        <strong>R$ {parcela.valor_parcela ? Number(parcela.valor_parcela).toFixed(2).replace('.', ',') : '0,00'}</strong>
      )
    },
    {
      key: 'data_vencimento',
      label: 'Vencimento',
      render: (parcela: any) => new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')
    },
    {
      key: 'nosso_numero',
      label: 'Nosso Número',
      render: (parcela: any) => (
        <code className="text-primary">
          {parcela.nosso_numero || 'Não gerado'}
        </code>
      )
    },
    {
      key: 'data_pagamento',
      label: 'Pagamento',
      render: (parcela: any) => (
        parcela.data_pagamento ? 
          new Date(parcela.data_pagamento).toLocaleDateString('pt-BR') : 
          '-'
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (parcela: any) => (
        <span className={`badge ${getStatusBadgeClass(parcela.status)}`}>
          {getStatusLabel(parcela.status)}
        </span>
      )
    }
  ];

  // Função para cancelar parcela
  const handleCancelarParcela = async (parcelaId: number) => {
    if (window.confirm('Tem certeza que deseja cancelar esta parcela?')) {
      try {
        const response = await CarneParcelaService.update(parcelaId, { status: 'cancelado' });
        
        // Mostrar notificação de sucesso com mensagem da API
        if (response?.message) {
          success(response.message);
        } else {
          success('Parcela cancelada com sucesso!');
        }
        
        queryClient.invalidateQueries({ queryKey: ['carne-parcelas', carneId] });
        queryClient.invalidateQueries({ queryKey: ['carne', carneId] });
      } catch (err: any) {
        error(err.response?.data?.message || 'Erro ao cancelar parcela');
      }
    }
  };

  // Funções para os botões do topo
  const handleTopoActions = (action: string, selectedItems: any[]) => {
    if (selectedItems.length === 0) return;
    
    switch (action) {
      case 'marcar_pago':
        if (selectedItems.length === 1) {
          handleMarcarPago(selectedItems[0].id);
        }
        break;
      case 'cancelar':
        if (selectedItems.length === 1) {
          handleCancelarParcela(selectedItems[0].id);
        }
        break;
      case 'imprimir':
        if (selectedItems.length === 1) {
          window.open(getApiUrl(`/boleto/web/${selectedItems[0].id}`), '_blank');
        }
        break;
      case 'editar':
        if (selectedItems.length === 1) {
          navigate(`/carne-parcelas/${selectedItems[0].id}/edit`);
        }
        break;
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2>Parcelas do Carnê {carneData?.numero_carne}</h2>
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <Link to="/carnes">Carnês</Link>
                  </li>
                  <li className="breadcrumb-item active">Parcelas</li>
                </ol>
              </nav>
            </div>
            <div>
              {!carneData?.carnet_id ? (
                <button 
                  type="button" 
                  className="btn btn-primary me-2"
                  onClick={handleRegistrarNoBanco}
                  disabled={isRegistering}
                >
                  {isRegistering ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Registrando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send"></i> Registrar no Banco
                    </>
                  )}
                </button>
              ) : (
                <span className="btn btn-success me-2" style={{ cursor: 'default' }}>
                  <i className="bi bi-check-circle"></i> Registrado no Banco
                </span>
              )}
              <Link to="/carnes" className="btn btn-secondary">
                <i className="bi bi-arrow-left"></i> Voltar
              </Link>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="row g-1 mb-2">
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body py-2">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <div className="small" style={{ color: 'var(--text-secondary)' }}>Total de Parcelas</div>
                      <div className="h6 mb-0" style={{ color: 'var(--text-primary)' }}>{totalParcelas}</div>
                    </div>
                    <div style={{ color: 'var(--primary-color)' }}>
                      <i className="bi bi-list-ol fs-5"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body py-2">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <div className="small" style={{ color: 'var(--text-secondary)' }}>Parcelas Pagas</div>
                      <div className="h6 mb-0" style={{ color: '#28a745' }}>{parcelasPagas}</div>
                    </div>
                    <div style={{ color: '#28a745' }}>
                      <i className="bi bi-check-circle fs-5"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body py-2">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <div className="small" style={{ color: 'var(--text-secondary)' }}>Parcelas Vencidas</div>
                      <div className="h6 mb-0" style={{ color: '#dc3545' }}>{parcelasVencidas}</div>
                    </div>
                    <div style={{ color: '#dc3545' }}>
                      <i className="bi bi-exclamation-triangle fs-5"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body py-2">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <div className="small" style={{ color: 'var(--text-secondary)' }}>Valor Pago</div>
                      <div className="h6 mb-0" style={{ color: '#17a2b8' }}>R$ {parseFloat(valorPago.toString()).toFixed(2).replace('.', ',')}</div>
                    </div>
                    <div style={{ color: '#17a2b8' }}>
                      <i className="bi bi-currency-dollar fs-5"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Informações do Carnê e Gráficos */}
          {carneData && (
            <div className="row g-1 mb-2">
              <div className="col-xl-6 col-lg-5">
                <div className="card">
                  <div className="card-header py-1">
                    <h6 className="card-title mb-0" style={{ color: 'var(--text-primary)' }}>Informações do Carnê</h6>
                  </div>
                  <div className="card-body py-1">
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-0">
                          <span className="small" style={{ color: 'var(--text-secondary)' }}>ID:</span>
                          <span className="ms-1" style={{ color: 'var(--primary-color)' }}>#{carneData.id}</span>
                        </div>
                        <div className="mb-0">
                          <span className="small" style={{ color: 'var(--text-secondary)' }}>Número do Carnê:</span>
                          <span className="ms-1" style={{ color: 'var(--text-primary)' }}>{carneData.numero_carne}</span>
                        </div>
                        <div className="mb-0">
                          <span className="small" style={{ color: 'var(--text-secondary)' }}>Cliente:</span>
                          <span className="ms-1" style={{ color: 'var(--text-primary)' }}>{carneData.cliente?.razao_social}</span>
                        </div>
                        <div className="mb-0">
                          <span className="small" style={{ color: 'var(--text-secondary)' }}>Plano:</span>
                          <span className="ms-1" style={{ color: 'var(--text-primary)' }}>{carneData.plano?.nome_plano}</span>
                        </div>
                        <div className="mb-0">
                          <span className="small" style={{ color: 'var(--text-secondary)' }}>Banco:</span>
                          <span className="ms-1" style={{ color: 'var(--text-primary)' }}>{carneData.banco?.nome}</span>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-0">
                          <span className="small" style={{ color: 'var(--text-secondary)' }}>Valor Total:</span>
                          <span className="ms-1" style={{ color: 'var(--text-primary)' }}>R$ {Number(carneData.valor_total || 0).toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="mb-0">
                          <span className="small" style={{ color: 'var(--text-secondary)' }}>Parcelas:</span>
                          <span className="ms-1" style={{ color: 'var(--text-primary)' }}>{carneData.quantidade_parcelas}</span>
                        </div>
                        <div className="mb-0">
                          <span className="small" style={{ color: 'var(--text-secondary)' }}>Status:</span>
                          <span className={`badge ms-1 ${getStatusBadgeClass(carneData.status)}`}>
                            {getStatusLabel(carneData.status)}
                          </span>
                        </div>
                        {carneData.carnet_id && (
                          <div className="mb-0">
                            <span className="small" style={{ color: 'var(--text-secondary)' }}>Carnet ID:</span>
                            <span className="ms-1" style={{ color: '#17a2b8' }}>{carneData.carnet_id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-xl-6 col-lg-7">
                <div className="row g-1">
                  <div className="col-6">
                    <div className="chart-card">
                      {(() => {
                        const parcelas = parcelasData?.data || [];
                        const parcelasPagas = parcelas.filter((p: any) => p.status === 'pago').length;
                        const parcelasPendentes = parcelas.filter((p: any) => p.status === 'pendente').length;
                        const parcelasVencidas = parcelas.filter((p: any) => p.status === 'vencido').length;
                        const parcelasCanceladas = parcelas.filter((p: any) => p.status === 'cancelado').length;
                        
                        const statusChartData = [
                          { label: 'Pagas', value: parcelasPagas, color: '#28a745' },
                          { label: 'Pendentes', value: parcelasPendentes, color: '#ffc107' },
                          { label: 'Vencidas', value: parcelasVencidas, color: '#dc3545' },
                          { label: 'Canceladas', value: parcelasCanceladas, color: '#6c757d' }
                        ].filter(item => item.value > 0);
                        
                        return renderPieChart(statusChartData, 'Status das Parcelas', hiddenStatus, toggleStatus);
                      })()}
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="chart-card">
                      {(() => {
                        const parcelas = parcelasData?.data || [];
                        const valorPago = parcelas.filter((p: any) => p.status === 'pago').reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0);
                        const valorPendente = parcelas.filter((p: any) => p.status === 'pendente').reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0);
                        const valorVencido = parcelas.filter((p: any) => p.status === 'vencido').reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0);
                        const valorCancelado = parcelas.filter((p: any) => p.status === 'cancelado').reduce((sum: number, p: any) => sum + Number(p.valor_parcela || 0), 0);
                        
                        const valoresChartData = [
                          { label: 'Pago', value: valorPago, color: '#28a745' },
                          { label: 'Pendente', value: valorPendente, color: '#ffc107' },
                          { label: 'Vencido', value: valorVencido, color: '#dc3545' },
                          { label: 'Cancelado', value: valorCancelado, color: '#6c757d' }
                        ].filter(item => item.value > 0);
                        
                        return renderPieChart(valoresChartData, 'Valores por Status (R$)', hiddenValores, toggleValores);
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabela de Parcelas */}
          <DataTable
            columns={columns}
            data={parcelasData?.data || []}
            isLoading={isLoading}
            pagination={parcelasData?.pagination}
            limit={limit}
            setLimit={setLimit}
            setPage={setPage}
            emptyMessage="Nenhuma parcela encontrada"
            searchPlaceholder="Buscar parcelas..."
            onSearch={setSearch}
            bulkActions={[
              {
                label: "Marcar como Pago",
                action: (selectedItems) => handleTopoActions('marcar_pago', selectedItems)
              },
              {
                label: "Cancelar",
                action: (selectedItems) => handleTopoActions('cancelar', selectedItems)
              },
              {
                label: "Imprimir",
                action: (selectedItems) => handleTopoActions('imprimir', selectedItems)
              },
              {
                label: "Editar",
                action: (selectedItems) => handleTopoActions('editar', selectedItems)
              }
            ]}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ['carne-parcelas', carneId] });
              queryClient.invalidateQueries({ queryKey: ['carne', carneId] });
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default CarneParcelas;
