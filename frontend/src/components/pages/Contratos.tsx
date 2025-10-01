import React, { useState } from 'react';
import { useContratos } from '../../hooks/useContratos';
import DataTable from '../common/DataTable';
import { Contrato } from '../../hooks/useContratos';
import { ContratoCreateModal } from '../modals/contratos/ContratoCreateModal';

const Contratos: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: contratos = [], isLoading, error, refetch } = useContratos();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-success';
      case 'inativo':
        return 'bg-danger';
      case 'suspenso':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  };

  const columns = [
    {
      key: 'id',
      label: 'ID',
      sortable: true
    },
    {
      key: 'cliente',
      label: 'Cliente',
      sortable: true,
      render: (contrato: Contrato) => (
        <div>
          <strong>{contrato.cliente?.razao_social}</strong>
          {contrato.cliente?.nome_fantasia && (
            <div className="text-muted small">{contrato.cliente.nome_fantasia}</div>
          )}
        </div>
      )
    },
    {
      key: 'plano',
      label: 'Plano',
      sortable: true,
      render: (contrato: Contrato) => (
        <div>
          <strong>{contrato.plano?.nome_plano}</strong>
          <div className="text-muted small">R$ {contrato.plano?.valor_mensal}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (contrato: Contrato) => (
        <span className={`badge ${getStatusColor(contrato.status)}`}>
          {contrato.status}
        </span>
      )
    },
    {
      key: 'desconto_percentual',
      label: 'Desconto %',
      sortable: true,
      render: (contrato: Contrato) => (
        contrato.desconto_percentual ? `${contrato.desconto_percentual}%` : '-'
      )
    },
    {
      key: 'desconto_valor',
      label: 'Desconto R$',
      sortable: true,
      render: (contrato: Contrato) => (
        contrato.desconto_valor ? `R$ ${contrato.desconto_valor}` : '-'
      )
    },
    {
      key: 'valor_final',
      label: 'Valor Final',
      sortable: true,
      render: (contrato: Contrato) => (
        contrato.valor_final ? `R$ ${contrato.valor_final}` : '-'
      )
    },
    {
      key: 'data_inicio',
      label: 'Data Início',
      sortable: true,
      render: (contrato: Contrato) => (
        contrato.data_inicio ? new Date(contrato.data_inicio).toLocaleDateString('pt-BR') : '-'
      )
    },
    {
      key: 'data_fim',
      label: 'Data Fim',
      sortable: true,
      render: (contrato: Contrato) => (
        contrato.data_fim ? new Date(contrato.data_fim).toLocaleDateString('pt-BR') : '-'
      )
    },
    {
      key: 'isento_mensalidade',
      label: 'Isento',
      sortable: true,
      render: (contrato: Contrato) => (
        <span className={`badge ${contrato.isento_mensalidade ? 'bg-success' : 'bg-secondary'}`}>
          {contrato.isento_mensalidade ? 'Sim' : 'Não'}
        </span>
      )
    },
    {
      key: 'dia_vencimento',
      label: 'Dia Venc.',
      sortable: true,
      render: (contrato: Contrato) => (
        contrato.dia_vencimento ? `Dia ${contrato.dia_vencimento}` : '-'
      )
    },
    {
      key: 'bancoBoleto',
      label: 'Banco Boleto',
      sortable: true,
      render: (contrato: Contrato) => (
        contrato.bancoBoleto?.nome || '-'
      )
    },
    {
      key: 'created_at',
      label: 'Criado em',
      sortable: true,
      render: (contrato: Contrato) => (
        new Date(contrato.created_at).toLocaleDateString('pt-BR')
      )
    }
  ];

  const bulkActions = [
    {
      label: 'Novo',
      action: () => setShowCreateModal(true),
      variant: 'primary'
    }
  ];

  if (error) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="alert alert-danger">
              Erro ao carregar contratos: {error.message}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Contratos</h2>
          </div>

          <DataTable
            data={contratos}
            columns={columns}
            loading={isLoading}
            bulkActions={bulkActions}
            searchFields={['cliente.razao_social', 'cliente.nome_fantasia', 'plano.nome_plano']}
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              pageSizeOptions: [10, 15, 25, 50, 100]
            }}
          />
        </div>
      </div>

      {/* Modal de Criação */}
      <ContratoCreateModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          refetch();
        }}
      />
    </div>
  );
};

export default Contratos;
