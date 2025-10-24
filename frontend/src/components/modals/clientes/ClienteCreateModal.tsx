import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClienteService } from '../../../services/clienteService';
import { PlanoService } from '../../../services/planoService';
import { BancoService } from '../../../services/bancoService';
import { useNotificationContext } from '../../../contexts/NotificationContext';
import DraggableModal from '../../common/DraggableModal';
import { Button } from '../../ui';
import { Form, FormConfig } from '../../forms';

interface ClienteForm {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  email: string;
  telefone: string;
  whatsapp: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  ativo: boolean;
  tipo_cobranca: 'titulo' | 'carne';
  valor_primeiro_titulo: 'total' | 'proporcional';
  dia_vencimento: number;
  conta_boleto: number;
  isento_mensalidade: boolean;
  recebe_email: boolean;
  recebe_sms: boolean;
  recebe_whatsapp: boolean;
  plano_id: number;
  desconto_percentual: number;
  desconto_valor: number;
  data_validade_desconto: string;
  data_inicio_plano: string;
  observacoes: string;
}

interface ClienteCreateModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ClienteCreateModal: React.FC<ClienteCreateModalProps> = ({ 
  show, 
  onClose, 
  onSuccess 
}) => {
  const { success, error } = useNotificationContext();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ClienteForm>({
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    email: '',
    telefone: '',
    whatsapp: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    ativo: true,
    tipo_cobranca: 'carne',
    valor_primeiro_titulo: 'total',
    dia_vencimento: 10,
    conta_boleto: 0,
    isento_mensalidade: false,
    recebe_email: true,
    recebe_sms: false,
    recebe_whatsapp: false,
    plano_id: 0,
    desconto_percentual: 0,
    desconto_valor: 0,
    data_validade_desconto: '',
    data_inicio_plano: '',
    observacoes: '',
  });

  // Queries para buscar dados
  const { data: planos } = useQuery({
    queryKey: ['planos-ativos'],
    queryFn: () => PlanoService.list({ status: 'ativo', limit: 100 }),
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  const { data: bancos } = useQuery({
    queryKey: ['bancos-ativos'],
    queryFn: () => BancoService.findAtivos(),
    staleTime: 60 * 1000,
    refetchOnMount: false,
  });

  // Configuração do formulário unificado
  const formConfig: FormConfig = {
    fields: [
      // Dados Básicos
      {
        name: 'cnpj',
        type: 'text',
        label: 'CNPJ',
        placeholder: '00.000.000/0000-00',
        required: true,
        size: 'sm',
        validation: [
          { type: 'required', message: 'CNPJ é obrigatório' },
          { type: 'pattern', value: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, message: 'CNPJ inválido' }
        ]
      },
      {
        name: 'razao_social',
        type: 'text',
        label: 'Razão Social',
        placeholder: 'Nome da empresa',
        required: true,
        size: 'sm',
        validation: [
          { type: 'required', message: 'Razão Social é obrigatória' }
        ]
      },
      {
        name: 'nome_fantasia',
        type: 'text',
        label: 'Nome Fantasia',
        placeholder: 'Nome fantasia da empresa',
        size: 'sm'
      },
      {
        name: 'email',
        type: 'email',
        label: 'Email',
        placeholder: 'email@empresa.com',
        required: true,
        size: 'sm',
        validation: [
          { type: 'required', message: 'Email é obrigatório' },
          { type: 'email', message: 'Email inválido' }
        ]
      },
      {
        name: 'telefone',
        type: 'tel',
        label: 'Telefone',
        placeholder: '(11) 99999-9999',
        required: true,
        size: 'sm',
        validation: [
          { type: 'required', message: 'Telefone é obrigatório' }
        ]
      },
      {
        name: 'whatsapp',
        type: 'tel',
        label: 'WhatsApp',
        placeholder: '(11) 99999-9999',
        size: 'sm'
      },
      // Endereço
      {
        name: 'cep',
        type: 'text',
        label: 'CEP',
        placeholder: '00000-000',
        size: 'sm'
      },
      {
        name: 'endereco',
        type: 'text',
        label: 'Endereço',
        placeholder: 'Rua, Avenida...',
        size: 'sm'
      },
      {
        name: 'numero',
        type: 'text',
        label: 'Número',
        placeholder: '123',
        size: 'sm'
      },
      {
        name: 'complemento',
        type: 'text',
        label: 'Complemento',
        placeholder: 'Apto, Sala...',
        size: 'sm'
      },
      {
        name: 'bairro',
        type: 'text',
        label: 'Bairro',
        placeholder: 'Nome do bairro',
        size: 'sm'
      },
      {
        name: 'cidade',
        type: 'text',
        label: 'Cidade',
        placeholder: 'Nome da cidade',
        size: 'sm'
      },
      {
        name: 'estado',
        type: 'text',
        label: 'Estado',
        placeholder: 'SP',
        size: 'sm',
        maxLength: 2
      },
      // Configurações
      {
        name: 'ativo',
        type: 'checkbox',
        label: 'Ativo',
        description: 'Cliente está ativo no sistema',
        switch: true
      },
      {
        name: 'tipo_cobranca',
        type: 'select',
        label: 'Tipo de Cobrança',
        options: [
          { value: 'titulo', label: 'Título' },
          { value: 'carne', label: 'Carnê' }
        ],
        size: 'sm'
      },
      {
        name: 'valor_primeiro_titulo',
        type: 'select',
        label: 'Valor Primeiro Título',
        options: [
          { value: 'total', label: 'Valor Total' },
          { value: 'proporcional', label: 'Proporcional' }
        ],
        size: 'sm'
      },
      {
        name: 'dia_vencimento',
        type: 'number',
        label: 'Dia de Vencimento',
        min: 1,
        max: 31,
        size: 'sm'
      },
      {
        name: 'conta_boleto',
        type: 'select',
        label: 'Conta para Boleto',
        options: bancos?.map(banco => ({
          value: banco.id,
          label: `${banco.nome}`
        })) || [],
        size: 'sm',
        clearable: true
      },
      {
        name: 'isento_mensalidade',
        type: 'checkbox',
        label: 'Isento de Mensalidade',
        description: 'Cliente não paga mensalidade',
        switch: true
      },
      {
        name: 'recebe_email',
        type: 'checkbox',
        label: 'Recebe Email',
        description: 'Cliente recebe notificações por email',
        switch: true
      },
      {
        name: 'recebe_sms',
        type: 'checkbox',
        label: 'Recebe SMS',
        description: 'Cliente recebe notificações por SMS',
        switch: true
      },
      {
        name: 'recebe_whatsapp',
        type: 'checkbox',
        label: 'Recebe WhatsApp',
        description: 'Cliente recebe notificações por WhatsApp',
        switch: true
      },
      {
        name: 'plano_id',
        type: 'select',
        label: 'Plano',
        options: planos?.data?.map(plano => ({
          value: plano.id,
          label: `${plano.nome_plano}`
        })) || [],
        size: 'sm',
        clearable: true
      },
      {
        name: 'desconto_percentual',
        type: 'number',
        label: 'Desconto Percentual (%)',
        min: 0,
        max: 100,
        step: 0.01,
        size: 'sm'
      },
      {
        name: 'desconto_valor',
        type: 'number',
        label: 'Desconto Valor (R$)',
        min: 0,
        step: 0.01,
        size: 'sm'
      },
      {
        name: 'data_validade_desconto',
        type: 'date',
        label: 'Data Validade Desconto',
        size: 'sm'
      },
      {
        name: 'data_inicio_plano',
        type: 'date',
        label: 'Data Início Plano',
        size: 'sm'
      },
      {
        name: 'observacoes',
        type: 'textarea',
        label: 'Observações',
        placeholder: 'Observações sobre o cliente',
        rows: 3,
        size: 'sm'
      }
    ],
    layout: 'vertical',
    columns: 2,
    spacing: 'sm',
    disabled: false
  };

  // Mutation para criar cliente
  const createClienteMutation = useMutation({
    mutationFn: (data: ClienteForm) => ClienteService.create(data),
    onSuccess: () => {
      success('Cliente criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Erro ao criar cliente');
    },
  });

  const handleCancel = () => {
    onClose();
  };

  return (
    <DraggableModal
      show={show}
      onClose={handleCancel}
      title="Cliente"
      modalId="cliente-create-modal"
      headerActions={
        <div className="d-flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCancel}
            disabled={createClienteMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={createClienteMutation.isPending}
            loading={createClienteMutation.isPending}
          >
            Criar Cliente
          </Button>
        </div>
      }
    >
      <Form
        key={`cliente-create-${formData.cnpj}-${formData.razao_social}`}
        config={formConfig}
        initialValues={formData}
        onSubmit={(data) => {
          createClienteMutation.mutate(data as ClienteForm);
        }}
        onReset={() => {
          setFormData({
            cnpj: '',
            razao_social: '',
            nome_fantasia: '',
            email: '',
            telefone: '',
            whatsapp: '',
            cep: '',
            endereco: '',
            numero: '',
            complemento: '',
            bairro: '',
            cidade: '',
            estado: '',
            ativo: true,
            tipo_cobranca: 'carne',
            valor_primeiro_titulo: 'total',
            dia_vencimento: 10,
            conta_boleto: 0,
            isento_mensalidade: false,
            recebe_email: true,
            recebe_sms: false,
            recebe_whatsapp: false,
            plano_id: 0,
            desconto_percentual: 0,
            desconto_valor: 0,
            data_validade_desconto: '',
            data_inicio_plano: '',
            observacoes: '',
          });
        }}
        showSubmitButton={false}
        showResetButton={false}
        className="cliente-form"
      />
    </DraggableModal>
  );
};

export default ClienteCreateModal;
