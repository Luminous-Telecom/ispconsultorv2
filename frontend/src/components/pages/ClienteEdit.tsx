import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ClienteService } from '../../services/clienteService';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { QCard, QCardSection, QTabs, QTab, QTabPanel, QBtn, QIcon, QSeparator } from 'quasar';

// Importar componentes das abas
import ClienteDadosBasicos from './forms/ClienteDadosBasicos';
import ClienteEndereco from './forms/ClienteEndereco';
import ClienteContato from './forms/ClienteContato';
import ClienteFinanceiro from './forms/ClienteFinanceiro';
import ClienteContratos from './forms/ClienteContratos';

const ClienteEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useNotificationContext();
  const [activeTab, setActiveTab] = useState<string>('dados-basicos');

  // Buscar dados do cliente
  const { data: cliente, isLoading, error: clienteError } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => ClienteService.getById(Number(id)),
    enabled: !!id,
  });

  // Estados para controle de edição
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Detectar mudanças nos dados
  useEffect(() => {
    if (cliente) {
      setHasChanges(false);
    }
  }, [cliente]);

  // Função para salvar dados
  const handleSave = async () => {
    try {
      // Aqui será implementada a lógica de salvamento
      success('Dados salvos com sucesso!');
      setHasChanges(false);
      setIsEditing(false);
      
      // Invalidar cache para recarregar dados
      queryClient.invalidateQueries({ queryKey: ['cliente', id] });
    } catch (err) {
      error('Erro ao salvar dados');
    }
  };

  // Função para cancelar edição
  const handleCancel = () => {
    setIsEditing(false);
    setHasChanges(false);
    // Recarregar dados originais se necessário
    queryClient.invalidateQueries({ queryKey: ['cliente', id] });
  };

  if (isLoading) {
    return (
      <div className="q-pa-md">
        <div className="text-center">Carregando dados do cliente...</div>
      </div>
    );
  }

  if (clienteError || !cliente) {
    return (
      <div className="q-pa-md">
        <div className="text-center text-negative">
          Erro ao carregar dados do cliente
        </div>
      </div>
    );
  }

  return (
    <div className="q-pa-md">
      {/* Cabeçalho com ações globais */}
      <div className="row items-center q-mb-md">
        <div className="col">
          <div className="text-h5 text-weight-bold">
            Editar Cliente - {cliente.razao_social || cliente.nome_fantasia}
          </div>
        </div>
        <div className="col-auto">
          <div className="q-gutter-sm">
            <QBtn
              color="primary"
              icon="add"
              label="Novo"
              @click={() => navigate('/clientes/create')}
            />
            <QBtn
              color="positive"
              icon="save"
              label="Salvar"
              :disable="!hasChanges"
              @click={handleSave}
            />
            <QBtn
              color="grey-7"
              icon="cancel"
              label="Cancelar"
              @click={handleCancel}
            />
            <QBtn
              color="negative"
              icon="delete"
              label="Deletar"
              @click={() => {
                // Implementar confirmação de exclusão
              }}
            />
            <QBtn
              color="primary"
              icon="location_on"
              label="Localização"
            />
            <QBtn
              color="primary"
              icon="notifications"
              label="Enviar notificação push"
            />
          </div>
        </div>
      </div>

      {/* Sistema de abas */}
      <QCard>
        <QTabs
          v-model={activeTab}
          dense
          class="text-grey-7"
          active-color="primary"
          indicator-color="primary"
          align="left"
        >
          <QTab name="dados-basicos" label="Cliente" icon="person" />
          <QTab name="endereco" label="Endereço" icon="home" />
          <QTab name="contato" label="Contato" icon="phone" />
          <QTab name="financeiro" label="Financeiro" icon="account_balance" />
          <QTab name="contratos" label="Contratos" icon="description" />
        </QTabs>

        <QSeparator />

        <QTabPanel name="dados-basicos">
          <QCardSection>
            <ClienteDadosBasicos
              cliente={cliente}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onDataChange={() => setHasChanges(true)}
            />
          </QCardSection>
        </QTabPanel>

        <QTabPanel name="endereco">
          <QCardSection>
            <ClienteEndereco
              cliente={cliente}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onDataChange={() => setHasChanges(true)}
            />
          </QCardSection>
        </QTabPanel>

        <QTabPanel name="contato">
          <QCardSection>
            <ClienteContato
              cliente={cliente}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onDataChange={() => setHasChanges(true)}
            />
          </QCardSection>
        </QTabPanel>

        <QTabPanel name="financeiro">
          <QCardSection>
            <ClienteFinanceiro
              cliente={cliente}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onDataChange={() => setHasChanges(true)}
            />
          </QCardSection>
        </QTabPanel>

        <QTabPanel name="contratos">
          <QCardSection>
            <ClienteContratos
              cliente={cliente}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onDataChange={() => setHasChanges(true)}
            />
          </QCardSection>
        </QTabPanel>
      </QCard>
    </div>
  );
};

export default ClienteEdit;
