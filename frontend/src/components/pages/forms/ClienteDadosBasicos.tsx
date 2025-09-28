import React, { useState, useEffect } from 'react';
import { QCard, QCardSection, QInput, QSelect, QRadio, QBtn, QIcon, QField } from 'quasar';

interface ClienteDadosBasicosProps {
  cliente: any;
  isEditing: boolean;
  onEdit: () => void;
  onDataChange: () => void;
}

const ClienteDadosBasicos: React.FC<ClienteDadosBasicosProps> = ({
  cliente,
  isEditing,
  onEdit,
  onDataChange
}) => {
  const [formData, setFormData] = useState({
    id: cliente?.id || '',
    ativo: cliente?.ativo ?? true,
    tipo_pessoa: cliente?.tipo_pessoa || 'juridica',
    razao_social: cliente?.razao_social || '',
    nome_fantasia: cliente?.nome_fantasia || '',
    cnpj: cliente?.cnpj || '',
    inscricao_estadual: cliente?.inscricao_estadual || '',
    email: cliente?.email || '',
    telefone: cliente?.telefone || '',
    whatsapp: cliente?.whatsapp || '',
    observacoes: cliente?.observacoes || ''
  });

  // Atualizar dados quando cliente mudar
  useEffect(() => {
    if (cliente) {
      setFormData({
        id: cliente.id || '',
        ativo: cliente.ativo ?? true,
        tipo_pessoa: cliente.tipo_pessoa || 'juridica',
        razao_social: cliente.razao_social || '',
        nome_fantasia: cliente.nome_fantasia || '',
        cnpj: cliente.cnpj || '',
        inscricao_estadual: cliente.inscricao_estadual || '',
        email: cliente.email || '',
        telefone: cliente.telefone || '',
        whatsapp: cliente.whatsapp || '',
        observacoes: cliente.observacoes || ''
      });
    }
  }, [cliente]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    onDataChange();
  };

  const handleEdit = () => {
    onEdit();
  };

  return (
    <div className="q-gutter-md">
      {/* Cabeçalho da seção */}
      <div className="row items-center">
        <div className="col">
          <div className="text-h6">Dados Básicos do Cliente</div>
        </div>
        <div className="col-auto">
          {!isEditing && (
            <QBtn
              color="primary"
              icon="edit"
              label="Editar"
              @click={handleEdit}
            />
          )}
        </div>
      </div>

      <QSeparator />

      {/* ID e Status Ativo */}
      <div className="row q-gutter-md">
        <div className="col-md-3">
          <QField label="ID" stack-label>
            <QInput
              v-model={formData.id}
              readonly
              filled
              :disable="!isEditing}
            />
          </QField>
        </div>
        <div className="col-md-3">
          <QField label="Status" stack-label>
            <div className="q-gutter-sm">
              <QRadio
                v-model={formData.ativo}
                :val={true}
                label="Ativo"
                :disable="!isEditing}
                @update:model-value={(val) => handleInputChange('ativo', val)}
              />
              <QRadio
                v-model={formData.ativo}
                :val={false}
                label="Inativo"
                :disable={!isEditing}
                @update:model-value={(val) => handleInputChange('ativo', val)}
              />
            </div>
          </QField>
        </div>
      </div>

      {/* Tipo de Pessoa */}
      <div className="row q-gutter-md">
        <div className="col-12">
          <QField label="Tipo de Pessoa *" stack-label>
            <div className="q-gutter-sm">
              <QRadio
                v-model={formData.tipo_pessoa}
                val="fisica"
                label="Pessoa Física"
                :disable={!isEditing}
                @update:model-value={(val) => handleInputChange('tipo_pessoa', val)}
              />
              <QRadio
                v-model={formData.tipo_pessoa}
                val="juridica"
                label="Pessoa Jurídica"
                :disable={!isEditing}
                @update:model-value={(val) => handleInputChange('tipo_pessoa', val)}
              />
            </div>
          </QField>
        </div>
      </div>

      {/* Razão Social/Nome e Nome Fantasia */}
      <div className="row q-gutter-md">
        <div className="col-md-6">
          <QField 
            label={formData.tipo_pessoa === 'juridica' ? 'Razão Social *' : 'Nome *'} 
            stack-label
          >
            <QInput
              v-model={formData.razao_social}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('razao_social', val)}
            />
          </QField>
        </div>
        <div className="col-md-6">
          <QField label="Nome Fantasia" stack-label>
            <QInput
              v-model={formData.nome_fantasia}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('nome_fantasia', val)}
            />
          </QField>
        </div>
      </div>

      {/* CNPJ/CPF e Inscrição Estadual */}
      <div className="row q-gutter-md">
        <div className="col-md-6">
          <QField 
            label={formData.tipo_pessoa === 'juridica' ? 'CNPJ *' : 'CPF *'} 
            stack-label
          >
            <QInput
              v-model={formData.cnpj}
              :disable={!isEditing}
              filled
              mask={formData.tipo_pessoa === 'juridica' ? '##.###.###/####-##' : '###.###.###-##'}
              @update:model-value={(val) => handleInputChange('cnpj', val)}
            />
          </QField>
        </div>
        <div className="col-md-6">
          <QField 
            label={formData.tipo_pessoa === 'juridica' ? 'Inscrição Estadual *' : 'RG *'} 
            stack-label
          >
            <QInput
              v-model={formData.inscricao_estadual}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('inscricao_estadual', val)}
            />
          </QField>
        </div>
      </div>

      {/* Email e Telefone */}
      <div className="row q-gutter-md">
        <div className="col-md-6">
          <QField label="Email" stack-label>
            <QInput
              v-model={formData.email}
              type="email"
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('email', val)}
            />
          </QField>
        </div>
        <div className="col-md-6">
          <QField label="Telefone" stack-label>
            <QInput
              v-model={formData.telefone}
              :disable={!isEditing}
              filled
              mask="(##) #####-####"
              @update:model-value={(val) => handleInputChange('telefone', val)}
            />
          </QField>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="row q-gutter-md">
        <div className="col-md-6">
          <QField label="WhatsApp" stack-label>
            <QInput
              v-model={formData.whatsapp}
              :disable={!isEditing}
              filled
              mask="(##) #####-####"
              @update:model-value={(val) => handleInputChange('whatsapp', val)}
            />
          </QField>
        </div>
      </div>

      {/* Observações */}
      <div className="row q-gutter-md">
        <div className="col-12">
          <QField label="Observações" stack-label>
            <QInput
              v-model={formData.observacoes}
              type="textarea"
              :disable={!isEditing}
              filled
              rows={3}
              @update:model-value={(val) => handleInputChange('observacoes', val)}
            />
          </QField>
        </div>
      </div>
    </div>
  );
};

export default ClienteDadosBasicos;
