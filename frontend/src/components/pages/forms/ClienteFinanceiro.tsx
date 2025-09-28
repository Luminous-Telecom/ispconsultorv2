import React, { useState, useEffect } from 'react';
import { QCard, QCardSection, QBtn, QIcon, QField, QSeparator, QTable, QCheckbox } from 'quasar';
import { useQuery } from '@tanstack/react-query';
import { CarneService } from '../../../services/carneService';
import { CarneParcelaService } from '../../../services/carneParcelaService';
import { getApiUrl } from '../../../config/api';

interface ClienteFinanceiroProps {
  cliente: any;
  isEditing: boolean;
  onEdit: () => void;
  onDataChange: () => void;
}

const ClienteFinanceiro: React.FC<ClienteFinanceiroProps> = ({
  cliente,
  isEditing,
  onEdit,
  onDataChange
}) => {
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'carnes' | 'titulos'>('carnes');

  // Buscar carnês do cliente
  const { data: carnes, isLoading: carnesLoading } = useQuery({
    queryKey: ['carnes', 'cliente', cliente?.id],
    queryFn: () => CarneService.list({ cliente_id: cliente?.id }),
    enabled: !!cliente?.id,
  });

  // Buscar títulos (parcelas) do cliente
  const { data: titulos, isLoading: titulosLoading } = useQuery({
    queryKey: ['titulos', 'cliente', cliente?.id],
    queryFn: () => CarneParcelaService.list({ cliente_id: cliente?.id }),
    enabled: !!cliente?.id,
  });

  // Colunas da tabela de carnês
  const carnesColumns = [
    {
      name: 'select',
      label: '',
      field: 'select',
      align: 'left' as const,
      sortable: false,
    },
    {
      name: 'id',
      label: 'ID',
      field: 'id',
      align: 'left' as const,
      sortable: true,
    },
    {
      name: 'numero_carne',
      label: 'Número Carnê',
      field: 'numero_carne',
      align: 'left' as const,
      sortable: true,
    },
    {
      name: 'valor_total',
      label: 'Valor Total',
      field: 'valor_total',
      align: 'right' as const,
      sortable: true,
      format: (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`,
    },
    {
      name: 'quantidade_parcelas',
      label: 'Parcelas',
      field: 'quantidade_parcelas',
      align: 'center' as const,
      sortable: true,
    },
    {
      name: 'status',
      label: 'Status',
      field: 'status',
      align: 'center' as const,
      sortable: true,
    },
    {
      name: 'data_vencimento_primeira',
      label: 'Primeiro Vencimento',
      field: 'data_vencimento_primeira',
      align: 'center' as const,
      sortable: true,
      format: (val: string) => new Date(val).toLocaleDateString('pt-BR'),
    },
    {
      name: 'actions',
      label: 'Ações',
      field: 'actions',
      align: 'center' as const,
      sortable: false,
    },
  ];

  // Colunas da tabela de títulos
  const titulosColumns = [
    {
      name: 'select',
      label: '',
      field: 'select',
      align: 'left' as const,
      sortable: false,
    },
    {
      name: 'id',
      label: 'ID',
      field: 'id',
      align: 'left' as const,
      sortable: true,
    },
    {
      name: 'numero_parcela',
      label: 'Parcela',
      field: 'numero_parcela',
      align: 'center' as const,
      sortable: true,
    },
    {
      name: 'valor_parcela',
      label: 'Valor',
      field: 'valor_parcela',
      align: 'right' as const,
      sortable: true,
      format: (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`,
    },
    {
      name: 'data_vencimento',
      label: 'Vencimento',
      field: 'data_vencimento',
      align: 'center' as const,
      sortable: true,
      format: (val: string) => new Date(val).toLocaleDateString('pt-BR'),
    },
    {
      name: 'status',
      label: 'Status',
      field: 'status',
      align: 'center' as const,
      sortable: true,
    },
    {
      name: 'data_pagamento',
      label: 'Data Pagamento',
      field: 'data_pagamento',
      align: 'center' as const,
      sortable: true,
      format: (val: string) => val ? new Date(val).toLocaleDateString('pt-BR') : '-',
    },
    {
      name: 'actions',
      label: 'Ações',
      field: 'actions',
      align: 'center' as const,
      sortable: false,
    },
  ];

  const handleSelectItems = (items: any[]) => {
    setSelectedItems(items);
  };

  const handleBulkAction = (action: string) => {
    if (selectedItems.length === 0) return;

    switch (action) {
      case 'visualizar':
        if (activeSubTab === 'carnes') {
          // Navegar para visualizar carnê
          window.open(`/carnes/${selectedItems[0].id}`, '_blank');
        } else {
          // Navegar para visualizar parcela
          window.open(`/carne-parcelas/${selectedItems[0].id}`, '_blank');
        }
        break;
      case 'imprimir':
        if (activeSubTab === 'carnes') {
          // Imprimir carnê
          window.open(getApiUrl(`/boleto/web/${selectedItems[0].id}`), '_blank');
        } else {
          // Imprimir parcela
          window.open(getApiUrl(`/boleto/web/${selectedItems[0].id}`), '_blank');
        }
        break;
      case 'marcar_pago':
        // Implementar marcação como pago
        console.log('Marcar como pago:', selectedItems);
        break;
      case 'editar':
        // Implementar edição
        console.log('Editar:', selectedItems);
        break;
      case 'deletar':
        // Implementar exclusão
        console.log('Deletar:', selectedItems);
        break;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago':
        return 'positive';
      case 'pendente':
        return 'warning';
      case 'cancelado':
        return 'negative';
      case 'parcial':
        return 'info';
      default:
        return 'grey';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pago':
        return 'Pago';
      case 'pendente':
        return 'Pendente';
      case 'cancelado':
        return 'Cancelado';
      case 'parcial':
        return 'Parcial';
      default:
        return status;
    }
  };

  return (
    <div className="q-gutter-md">
      {/* Cabeçalho da seção */}
      <div className="row items-center">
        <div className="col">
          <div className="text-h6">Financeiro do Cliente</div>
        </div>
        <div className="col-auto">
          {!isEditing && (
            <QBtn
              color="primary"
              icon="edit"
              label="Editar"
              onClick={onEdit}
            />
          )}
        </div>
      </div>

      <QSeparator />

      {/* Sub-abas para Carnês e Títulos */}
      <div className="row q-gutter-sm q-mb-md">
        <QBtn
          color={activeSubTab === 'carnes' ? 'primary' : 'grey-7'}
          flat={activeSubTab !== 'carnes'}
          label="Carnês"
          icon="account_balance_wallet"
          onClick={() => setActiveSubTab('carnes')}
        />
        <QBtn
          color={activeSubTab === 'titulos' ? 'primary' : 'grey-7'}
          flat={activeSubTab !== 'titulos'}
          label="Títulos"
          icon="receipt"
          onClick={() => setActiveSubTab('titulos')}
        />
      </div>

      {/* Ações em lote */}
      <div className="row q-gutter-sm q-mb-md">
        <QBtn
          color="primary"
          icon="visibility"
          label="Visualizar"
          disable={selectedItems.length === 0}
          onClick={() => handleBulkAction('visualizar')}
        />
        <QBtn
          color="primary"
          icon="print"
          label="Imprimir"
          disable={selectedItems.length === 0}
          onClick={() => handleBulkAction('imprimir')}
        />
        <QBtn
          color="positive"
          icon="check_circle"
          label="Marcar como Pago"
          disable={selectedItems.length === 0}
          onClick={() => handleBulkAction('marcar_pago')}
        />
        <QBtn
          color="warning"
          icon="edit"
          label="Editar"
          disable={selectedItems.length === 0}
          onClick={() => handleBulkAction('editar')}
        />
        <QBtn
          color="negative"
          icon="delete"
          label="Deletar"
          disable={selectedItems.length === 0}
          onClick={() => handleBulkAction('deletar')}
        />
      </div>

      {/* Tabela de Carnês */}
      {activeSubTab === 'carnes' && (
        <QCard>
          <QCardSection>
            <QTable
              rows={carnes?.data || []}
              columns={carnesColumns}
              row-key="id"
              selection="multiple"
              selected={selectedItems}
              loading={carnesLoading}
              rows-per-page-options={[10, 25, 50]}
              pagination={{ rowsPerPage: 15 }}
            >
              <template slot="body-cell-select" slot-scope="props">
                <QCheckbox
                  v-model={props.selected}
                  onUpdate:modelValue={handleSelectItems}
                />
              </template>

              <template slot="body-cell-status" slot-scope="props">
                <QBtn
                  color={getStatusColor(props.value)}
                  label={getStatusLabel(props.value)}
                  dense
                  flat
                  size="sm"
                />
              </template>

              <template slot="body-cell-actions" slot-scope="props">
                <div className="q-gutter-xs">
                  <QBtn
                    color="primary"
                    icon="visibility"
                    size="sm"
                    flat
                    dense
                    onClick={() => window.open(`/carnes/${props.row.id}`, '_blank')}
                  />
                  <QBtn
                    color="primary"
                    icon="print"
                    size="sm"
                    flat
                    dense
                    onClick={() => window.open(getApiUrl(`/boleto/web/${props.row.id}`), '_blank')}
                  />
                  <QBtn
                    color="warning"
                    icon="edit"
                    size="sm"
                    flat
                    dense
                    onClick={() => window.open(`/carnes/${props.row.id}/edit`, '_blank')}
                  />
                </div>
              </template>
            </QTable>
          </QCardSection>
        </QCard>
      )}

      {/* Tabela de Títulos */}
      {activeSubTab === 'titulos' && (
        <QCard>
          <QCardSection>
            <QTable
              rows={titulos?.data || []}
              columns={titulosColumns}
              row-key="id"
              selection="multiple"
              selected={selectedItems}
              loading={titulosLoading}
              rows-per-page-options={[10, 25, 50]}
              pagination={{ rowsPerPage: 15 }}
            >
              <template slot="body-cell-select" slot-scope="props">
                <QCheckbox
                  v-model={props.selected}
                  onUpdate:modelValue={handleSelectItems}
                />
              </template>

              <template slot="body-cell-status" slot-scope="props">
                <QBtn
                  color={getStatusColor(props.value)}
                  label={getStatusLabel(props.value)}
                  dense
                  flat
                  size="sm"
                />
              </template>

              <template slot="body-cell-actions" slot-scope="props">
                <div className="q-gutter-xs">
                  <QBtn
                    color="primary"
                    icon="visibility"
                    size="sm"
                    flat
                    dense
                    onClick={() => window.open(`/carne-parcelas/${props.row.id}`, '_blank')}
                  />
                  <QBtn
                    color="primary"
                    icon="print"
                    size="sm"
                    flat
                    dense
                    onClick={() => window.open(getApiUrl(`/boleto/web/${props.row.id}`), '_blank')}
                  />
                </div>
              </template>
            </QTable>
          </QCardSection>
        </QCard>
      )}

      {/* Resumo financeiro */}
      <QCard flat bordered>
        <QCardSection>
          <div className="row q-gutter-md">
            <div className="col-md-3">
              <div className="text-caption text-grey-7">Valor Total</div>
              <div className="text-h6">R$ 0,00</div>
            </div>
            <div className="col-md-3">
              <div className="text-caption text-grey-7">Valor Pago</div>
              <div className="text-h6 text-positive">R$ 0,00</div>
            </div>
            <div className="col-md-3">
              <div className="text-caption text-grey-7">Valor Pendente</div>
              <div className="text-h6 text-warning">R$ 0,00</div>
            </div>
            <div className="col-md-3">
              <div className="text-caption text-grey-7">Valor Cancelado</div>
              <div className="text-h6 text-negative">R$ 0,00</div>
            </div>
          </div>
        </QCardSection>
      </QCard>
    </div>
  );
};

export default ClienteFinanceiro;
