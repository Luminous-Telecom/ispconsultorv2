import React, { useState, useEffect } from 'react';
import { QCard, QCardSection, QBtn, QIcon, QField, QSeparator, QTable, QCheckbox } from 'quasar';
import { useQuery } from '@tanstack/react-query';
import { PlanoService } from '../../../services/planoService';

interface ClienteContratosProps {
  cliente: any;
  isEditing: boolean;
  onEdit: () => void;
  onDataChange: () => void;
}

const ClienteContratos: React.FC<ClienteContratosProps> = ({
  cliente,
  isEditing,
  onEdit,
  onDataChange
}) => {
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [showCancelados, setShowCancelados] = useState(false);

  // Buscar planos do cliente (simulando contratos)
  const { data: contratos, isLoading: contratosLoading } = useQuery({
    queryKey: ['contratos', 'cliente', cliente?.id],
    queryFn: () => PlanoService.list(),
    enabled: !!cliente?.id,
  });

  // Colunas da tabela de contratos
  const contratosColumns = [
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
      name: 'nome_plano',
      label: 'Plano',
      field: 'nome_plano',
      align: 'left' as const,
      sortable: true,
    },
    {
      name: 'tipo_servico',
      label: 'Tipo Serviço',
      field: 'tipo_servico',
      align: 'left' as const,
      sortable: true,
    },
    {
      name: 'valor_mensal',
      label: 'Valor Mensal',
      field: 'valor_mensal',
      align: 'right' as const,
      sortable: true,
      format: (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`,
    },
    {
      name: 'quantidade_usuarios',
      label: 'Usuários',
      field: 'quantidade_usuarios',
      align: 'center' as const,
      sortable: true,
    },
    {
      name: 'periodicidade',
      label: 'Periodicidade',
      field: 'periodicidade',
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
      name: 'data_inicio',
      label: 'Data Início',
      field: 'data_inicio',
      align: 'center' as const,
      sortable: true,
      format: (val: string) => val ? new Date(val).toLocaleDateString('pt-BR') : '-',
    },
    {
      name: 'data_fim',
      label: 'Data Fim',
      field: 'data_fim',
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
      case 'novo':
        // Navegar para novo contrato
        window.open('/planos/create', '_blank');
        break;
      case 'editar':
        // Navegar para editar contrato
        window.open(`/planos/${selectedItems[0].id}/edit`, '_blank');
        break;
      case 'deletar':
        // Implementar exclusão
        console.log('Deletar contratos:', selectedItems);
        break;
      case 'alteracao_wizard':
        // Implementar wizard de alteração
        console.log('Wizard de alteração:', selectedItems);
        break;
      case 'imprimir':
        // Implementar impressão
        console.log('Imprimir contratos:', selectedItems);
        break;
      case 'detalhamento_financeiro':
        // Navegar para detalhamento financeiro
        console.log('Detalhamento financeiro:', selectedItems);
        break;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'positive';
      case 'inativo':
        return 'negative';
      case 'suspenso':
        return 'warning';
      case 'cancelado':
        return 'grey';
      default:
        return 'grey';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'Ativo';
      case 'inativo':
        return 'Inativo';
      case 'suspenso':
        return 'Suspenso';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'check_circle';
      case 'inativo':
        return 'cancel';
      case 'suspenso':
        return 'pause_circle';
      case 'cancelado':
        return 'block';
      default:
        return 'help';
    }
  };

  return (
    <div className="q-gutter-md">
      {/* Cabeçalho da seção */}
      <div className="row items-center">
        <div className="col">
          <div className="text-h6">Contratos do Cliente</div>
        </div>
        <div className="col-auto">
          {!isEditing && (
            <QBtn
              color="primary"
              icon="edit"
              label="Editar"
              @click={onEdit}
            />
          )}
        </div>
      </div>

      <QSeparator />

      {/* Ações em lote */}
      <div className="row q-gutter-sm q-mb-md">
        <QBtn
          color="primary"
          icon="add"
          label="Novo"
          @click={() => handleBulkAction('novo')}
        />
        <QBtn
          color="warning"
          icon="edit"
          label="Editar"
          :disable={selectedItems.length === 0}
          @click={() => handleBulkAction('editar')}
        />
        <QBtn
          color="negative"
          icon="delete"
          label="Deletar"
          :disable={selectedItems.length === 0}
          @click={() => handleBulkAction('deletar')}
        />
        <QBtn
          color="info"
          icon="wizard"
          label="Alteração Wizard"
          :disable={selectedItems.length === 0}
          @click={() => handleBulkAction('alteracao_wizard')}
        />
        <QBtn
          color="primary"
          icon="print"
          label="Imprimir"
          :disable={selectedItems.length === 0}
          @click={() => handleBulkAction('imprimir')}
        />
        <QBtn
          color="primary"
          icon="account_balance"
          label="Detalhamento Financeiro"
          :disable={selectedItems.length === 0}
          @click={() => handleBulkAction('detalhamento_financeiro')}
        />
      </div>

      {/* Filtros */}
      <div className="row q-gutter-sm q-mb-md">
        <QCheckbox
          v-model={showCancelados}
          label="Mostrar cancelados"
        />
      </div>

      {/* Navegação de dados */}
      <div className="row items-center q-mb-md">
        <div className="col">
          <div className="text-caption text-grey-7">
            Mostrando {contratos?.data?.length || 0} contratos
          </div>
        </div>
        <div className="col-auto">
          <div className="q-gutter-sm">
            <QBtn
              color="grey-7"
              icon="first_page"
              flat
              dense
              @click={() => {/* Primeira página */}}
            />
            <QBtn
              color="grey-7"
              icon="chevron_left"
              flat
              dense
              @click={() => {/* Página anterior */}}
            />
            <QBtn
              color="grey-7"
              icon="refresh"
              flat
              dense
              @click={() => {/* Recarregar */}}
            />
            <QBtn
              color="grey-7"
              icon="chevron_right"
              flat
              dense
              @click={() => {/* Próxima página */}}
            />
            <QBtn
              color="grey-7"
              icon="last_page"
              flat
              dense
              @click={() => {/* Última página */}}
            />
            <QBtn
              color="grey-7"
              icon="download"
              flat
              dense
              @click={() => {/* Download */}}
            />
          </div>
        </div>
      </div>

      {/* Tabela de contratos */}
      <QCard>
        <QCardSection>
          <QTable
            :rows="contratos?.data || []"
            :columns="contratosColumns"
            row-key="id"
            selection="multiple"
            v-model:selected="selectedItems"
            :loading="contratosLoading"
            :rows-per-page-options="[10, 25, 50]"
            :pagination="{ rowsPerPage: 15 }"
          >
            <template v-slot:body-cell-select="props">
              <QCheckbox
                v-model="props.selected"
                @update:model-value="handleSelectItems"
              />
            </template>

            <template v-slot:body-cell-status="props">
              <div className="row items-center q-gutter-xs">
                <QIcon
                  :name="getStatusIcon(props.value)"
                  :color="getStatusColor(props.value)"
                  size="sm"
                />
                <span :class="`text-${getStatusColor(props.value)}`">
                  {getStatusLabel(props.value)}
                </span>
              </div>
            </template>

            <template v-slot:body-cell-actions="props">
              <div className="q-gutter-xs">
                <QBtn
                  color="primary"
                  icon="visibility"
                  size="sm"
                  flat
                  dense
                  @click={() => window.open(`/planos/${props.row.id}`, '_blank')}
                />
                <QBtn
                  color="warning"
                  icon="edit"
                  size="sm"
                  flat
                  dense
                  @click={() => window.open(`/planos/${props.row.id}/edit`, '_blank')}
                />
                <QBtn
                  color="primary"
                  icon="print"
                  size="sm"
                  flat
                  dense
                  @click={() => console.log('Imprimir contrato:', props.row.id)}
                />
              </div>
            </template>
          </QTable>
        </QCardSection>
      </QCard>

      {/* Resumo dos contratos */}
      <QCard flat bordered>
        <QCardSection>
          <div className="row q-gutter-md">
            <div className="col-md-3">
              <div className="text-caption text-grey-7">Total de Contratos</div>
              <div className="text-h6">{contratos?.data?.length || 0}</div>
            </div>
            <div className="col-md-3">
              <div className="text-caption text-grey-7">Contratos Ativos</div>
              <div className="text-h6 text-positive">
                {contratos?.data?.filter((c: any) => c.status === 'ativo').length || 0}
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-caption text-grey-7">Contratos Inativos</div>
              <div className="text-h6 text-negative">
                {contratos?.data?.filter((c: any) => c.status === 'inativo').length || 0}
              </div>
            </div>
            <div className="col-md-3">
              <div className="text-caption text-grey-7">Valor Total Mensal</div>
              <div className="text-h6 text-primary">
                R$ {contratos?.data?.reduce((total: number, c: any) => total + parseFloat(c.valor_mensal || 0), 0).toFixed(2).replace('.', ',')}
              </div>
            </div>
          </div>
        </QCardSection>
      </QCard>
    </div>
  );
};

export default ClienteContratos;
