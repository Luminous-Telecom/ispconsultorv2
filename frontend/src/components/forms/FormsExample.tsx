import React from 'react';
import { Form, ValidationRules, CTMValidationRules, FieldConfig } from './index';

// Exemplo de uso do sistema de formulários unificado
const FormsExample: React.FC = () => {
  // Configuração do formulário de cliente
  const clienteFormConfig: FieldConfig[] = [
    {
      name: 'nome',
      type: 'text',
      label: 'Nome Completo',
      placeholder: 'Digite o nome completo',
      required: true,
      validation: [
        ValidationRules.required('Nome é obrigatório'),
        ValidationRules.minLength(2, 'Nome deve ter pelo menos 2 caracteres'),
        ValidationRules.maxLength(100, 'Nome deve ter no máximo 100 caracteres'),
      ],
      tooltip: 'Nome completo da pessoa física ou jurídica',
    },
    {
      name: 'email',
      type: 'email',
      label: 'Email',
      placeholder: 'Digite o email',
      required: true,
      validation: [
        ValidationRules.required('Email é obrigatório'),
        ValidationRules.email('Email inválido'),
      ],
      tooltip: 'Email válido para contato',
    },
    {
      name: 'telefone',
      type: 'tel',
      label: 'Telefone',
      placeholder: '(11) 99999-9999',
      validation: [
        CTMValidationRules.phone('Telefone inválido'),
      ],
      tooltip: 'Telefone com DDD',
    },
    {
      name: 'cpf_cnpj',
      type: 'text',
      label: 'CPF/CNPJ',
      placeholder: '000.000.000-00 ou 00.000.000/0000-00',
      validation: [
        CTMValidationRules.cpfOrCnpj('CPF ou CNPJ inválido'),
      ],
      tooltip: 'CPF para pessoa física ou CNPJ para pessoa jurídica',
    },
    {
      name: 'cep',
      type: 'text',
      label: 'CEP',
      placeholder: '00000-000',
      validation: [
        CTMValidationRules.cep('CEP inválido'),
      ],
      tooltip: 'CEP para busca automática do endereço',
    },
    {
      name: 'endereco',
      type: 'text',
      label: 'Endereço',
      placeholder: 'Rua, Avenida, etc.',
      validation: [
        ValidationRules.maxLength(200, 'Endereço deve ter no máximo 200 caracteres'),
      ],
    },
    {
      name: 'numero',
      type: 'text',
      label: 'Número',
      placeholder: '123',
      validation: [
        ValidationRules.maxLength(10, 'Número deve ter no máximo 10 caracteres'),
      ],
    },
    {
      name: 'cidade',
      type: 'text',
      label: 'Cidade',
      placeholder: 'Digite a cidade',
      validation: [
        ValidationRules.maxLength(100, 'Cidade deve ter no máximo 100 caracteres'),
      ],
    },
    {
      name: 'estado',
      type: 'select',
      label: 'Estado',
      placeholder: 'Selecione o estado',
      required: true,
      options: [
        { value: 'AC', label: 'Acre' },
        { value: 'AL', label: 'Alagoas' },
        { value: 'AP', label: 'Amapá' },
        { value: 'AM', label: 'Amazonas' },
        { value: 'BA', label: 'Bahia' },
        { value: 'CE', label: 'Ceará' },
        { value: 'DF', label: 'Distrito Federal' },
        { value: 'ES', label: 'Espírito Santo' },
        { value: 'GO', label: 'Goiás' },
        { value: 'MA', label: 'Maranhão' },
        { value: 'MT', label: 'Mato Grosso' },
        { value: 'MS', label: 'Mato Grosso do Sul' },
        { value: 'MG', label: 'Minas Gerais' },
        { value: 'PA', label: 'Pará' },
        { value: 'PB', label: 'Paraíba' },
        { value: 'PR', label: 'Paraná' },
        { value: 'PE', label: 'Pernambuco' },
        { value: 'PI', label: 'Piauí' },
        { value: 'RJ', label: 'Rio de Janeiro' },
        { value: 'RN', label: 'Rio Grande do Norte' },
        { value: 'RS', label: 'Rio Grande do Sul' },
        { value: 'RO', label: 'Rondônia' },
        { value: 'RR', label: 'Roraima' },
        { value: 'SC', label: 'Santa Catarina' },
        { value: 'SP', label: 'São Paulo' },
        { value: 'SE', label: 'Sergipe' },
        { value: 'TO', label: 'Tocantins' },
      ],
      validation: [
        ValidationRules.required('Estado é obrigatório'),
      ],
    },
    {
      name: 'observacoes',
      type: 'textarea',
      label: 'Observações',
      placeholder: 'Observações adicionais',
      rows: 4,
      validation: [
        ValidationRules.maxLength(500, 'Observações devem ter no máximo 500 caracteres'),
      ],
      helpText: 'Campo opcional para observações adicionais',
    },
    {
      name: 'ativo',
      type: 'checkbox',
      label: 'Cliente Ativo',
      description: 'Marque se o cliente está ativo no sistema',
      switch: true,
      defaultValue: true,
    },
    {
      name: 'recebe_email',
      type: 'checkbox',
      label: 'Recebe Email',
      description: 'Cliente autoriza receber emails',
      defaultValue: true,
    },
    {
      name: 'recebe_sms',
      type: 'checkbox',
      label: 'Recebe SMS',
      description: 'Cliente autoriza receber SMS',
    },
  ];

  // Configuração do formulário de plano
  const planoFormConfig: FieldConfig[] = [
    {
      name: 'nome_plano',
      type: 'text',
      label: 'Nome do Plano',
      placeholder: 'Digite o nome do plano',
      required: true,
      validation: [
        ValidationRules.required('Nome do plano é obrigatório'),
        ValidationRules.minLength(2, 'Nome deve ter pelo menos 2 caracteres'),
        ValidationRules.maxLength(100, 'Nome deve ter no máximo 100 caracteres'),
      ],
    },
    {
      name: 'descricao',
      type: 'textarea',
      label: 'Descrição',
      placeholder: 'Descreva o plano',
      rows: 3,
      validation: [
        ValidationRules.maxLength(500, 'Descrição deve ter no máximo 500 caracteres'),
      ],
    },
    {
      name: 'tipo_servico',
      type: 'select',
      label: 'Tipo de Serviço',
      placeholder: 'Selecione o tipo',
      required: true,
      options: [
        { value: 'internet', label: 'Internet' },
        { value: 'telefonia', label: 'Telefonia' },
        { value: 'tv', label: 'TV' },
        { value: 'suporte', label: 'Suporte' },
        { value: 'infraestrutura', label: 'Infraestrutura' },
        { value: 'consultoria', label: 'Consultoria' },
        { value: 'outros', label: 'Outros' },
      ],
      validation: [
        ValidationRules.required('Tipo de serviço é obrigatório'),
      ],
    },
    {
      name: 'valor_mensal',
      type: 'number',
      label: 'Valor Mensal',
      placeholder: '0.00',
      required: true,
      min: 0,
      step: 0.01,
      validation: [
        ValidationRules.required('Valor mensal é obrigatório'),
        ValidationRules.min(0, 'Valor deve ser maior ou igual a zero'),
        ValidationRules.max(10000, 'Valor deve ser menor que R$ 10.000'),
      ],
      tooltip: 'Valor em reais (R$)',
    },
    {
      name: 'desconto_percentual',
      type: 'number',
      label: 'Desconto (%)',
      placeholder: '0',
      min: 0,
      max: 100,
      step: 0.01,
      validation: [
        ValidationRules.min(0, 'Desconto deve ser maior ou igual a zero'),
        ValidationRules.max(100, 'Desconto deve ser menor ou igual a 100%'),
      ],
      tooltip: 'Desconto percentual aplicado',
    },
    {
      name: 'periodicidade',
      type: 'select',
      label: 'Periodicidade',
      placeholder: 'Selecione a periodicidade',
      options: [
        { value: 'mensal', label: 'Mensal' },
        { value: 'trimestral', label: 'Trimestral' },
        { value: 'semestral', label: 'Semestral' },
        { value: 'anual', label: 'Anual' },
        { value: 'bimestral', label: 'Bimestral' },
        { value: 'quinzenal', label: 'Quinzenal' },
        { value: 'semanal', label: 'Semanal' },
      ],
      defaultValue: 'mensal',
    },
    {
      name: 'renovacao_automatica',
      type: 'checkbox',
      label: 'Renovação Automática',
      description: 'Plano é renovado automaticamente',
      switch: true,
      defaultValue: true,
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      placeholder: 'Selecione o status',
      required: true,
      options: [
        { value: 'ativo', label: 'Ativo' },
        { value: 'inativo', label: 'Inativo' },
        { value: 'cancelado', label: 'Cancelado' },
      ],
      defaultValue: 'ativo',
      validation: [
        ValidationRules.required('Status é obrigatório'),
      ],
    },
  ];

  // Handlers para os formulários
  const handleClienteSubmit = async (data: Record<string, any>) => {
    console.log('Dados do cliente:', data);
    alert('Cliente salvo com sucesso!');
  };

  const handlePlanoSubmit = async (data: Record<string, any>) => {
    console.log('Dados do plano:', data);
    alert('Plano salvo com sucesso!');
  };

  const handleFieldChange = (name: string, value: any, allData: Record<string, any>) => {
    console.log(`Campo ${name} alterado:`, value);
  };

  return (
    <div className="container mt-4">
      <h2>Sistema de Formulários Unificado</h2>
      
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Formulário de Cliente</h5>
            </div>
            <div className="card-body">
              <Form
                config={{
                  fields: clienteFormConfig,
                  layout: 'vertical',
                  spacing: 'md',
                  validateOnChange: true,
                  validateOnBlur: true,
                  validateOnSubmit: true,
                }}
                initialValues={{
                  ativo: true,
                  recebe_email: true,
                  recebe_sms: false,
                }}
                onSubmit={handleClienteSubmit}
                onFieldChange={handleFieldChange}
                showSubmitButton={true}
                showResetButton={true}
                submitButtonText="Salvar Cliente"
                resetButtonText="Limpar"
                submitButtonVariant="primary"
                resetButtonVariant="secondary"
              />
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>Formulário de Plano</h5>
            </div>
            <div className="card-body">
              <Form
                config={{
                  fields: planoFormConfig,
                  layout: 'vertical',
                  spacing: 'md',
                  validateOnChange: true,
                  validateOnBlur: true,
                  validateOnSubmit: true,
                }}
                initialValues={{
                  periodicidade: 'mensal',
                  renovacao_automatica: true,
                  status: 'ativo',
                }}
                onSubmit={handlePlanoSubmit}
                onFieldChange={handleFieldChange}
                showSubmitButton={true}
                showResetButton={true}
                submitButtonText="Salvar Plano"
                resetButtonText="Limpar"
                submitButtonVariant="success"
                resetButtonVariant="secondary"
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="row mt-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5>Formulário com Layout Horizontal</h5>
            </div>
            <div className="card-body">
              <Form
                config={{
                  fields: [
                    {
                      name: 'nome',
                      type: 'text',
                      label: 'Nome',
                      required: true,
                      validation: [ValidationRules.required()],
                    },
                    {
                      name: 'email',
                      type: 'email',
                      label: 'Email',
                      required: true,
                      validation: [ValidationRules.required(), ValidationRules.email()],
                    },
                    {
                      name: 'ativo',
                      type: 'checkbox',
                      label: 'Ativo',
                      switch: true,
                    },
                  ],
                  layout: 'horizontal',
                  spacing: 'sm',
                }}
                onSubmit={(data) => console.log('Dados:', data)}
                showSubmitButton={true}
                submitButtonText="Enviar"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormsExample;
