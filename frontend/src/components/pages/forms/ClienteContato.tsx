import React, { useState, useEffect } from 'react';
import { QCard, QCardSection, QInput, QBtn, QIcon, QField, QSeparator, QSelect, QRadio } from 'quasar';

interface ClienteContatoProps {
  cliente: any;
  isEditing: boolean;
  onEdit: () => void;
  onDataChange: () => void;
}

const ClienteContato: React.FC<ClienteContatoProps> = ({
  cliente,
  isEditing,
  onEdit,
  onDataChange
}) => {
  const [formData, setFormData] = useState({
    telefone_residencial: cliente?.telefone || '',
    telefone_comercial: '',
    ramal: '',
    operadora_celular: '',
    telefone_celular: cliente?.whatsapp || '',
    whatsapp: cliente?.whatsapp || '',
    email_principal: cliente?.email || '',
    contato: '',
    website: '',
    skype: '',
    facebook: '',
    // Central do assinante
    login: cliente?.email || '',
    senha: '•••••••••',
    permitir_acesso_automatico: 'nao'
  });

  // Atualizar dados quando cliente mudar
  useEffect(() => {
    if (cliente) {
      setFormData({
        telefone_residencial: cliente.telefone || '',
        telefone_comercial: '',
        ramal: '',
        operadora_celular: '',
        telefone_celular: cliente.whatsapp || '',
        whatsapp: cliente.whatsapp || '',
        email_principal: cliente.email || '',
        contato: '',
        website: '',
        skype: '',
        facebook: '',
        login: cliente.email || '',
        senha: '•••••••••',
        permitir_acesso_automatico: 'nao'
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

  const handleEnviarMensagem = () => {
    console.log('Enviando mensagem para:', formData.telefone_celular);
  };

  const handleChamarWhatsapp = () => {
    console.log('Chamando WhatsApp:', formData.whatsapp);
  };

  const handleEnviarEmail = () => {
    console.log('Enviando email para:', formData.email_principal);
  };

  return (
    <div className="q-gutter-md">
      {/* Cabeçalho da seção */}
      <div className="row items-center">
        <div className="col">
          <div className="text-h6">Informações de Contato</div>
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

      {/* Telefones */}
      <div className="row q-gutter-md">
        <div className="col-md-4">
          <QField label="Telefone residencial" stack-label>
            <QInput
              v-model={formData.telefone_residencial}
              :disable={!isEditing}
              filled
              mask="(##) ####-####"
              @update:model-value={(val) => handleInputChange('telefone_residencial', val)}
            />
          </QField>
        </div>
        <div className="col-md-4">
          <QField label="Telefone comercial" stack-label>
            <QInput
              v-model={formData.telefone_comercial}
              :disable={!isEditing}
              filled
              mask="(##) ####-####"
              @update:model-value={(val) => handleInputChange('telefone_comercial', val)}
            />
          </QField>
        </div>
        <div className="col-md-4">
          <QField label="Ramal" stack-label>
            <QInput
              v-model={formData.ramal}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('ramal', val)}
            />
          </QField>
        </div>
      </div>

      {/* Operadora e Celular */}
      <div className="row q-gutter-md">
        <div className="col-md-4">
          <QField label="Operadora celular" stack-label>
            <QSelect
              v-model={formData.operadora_celular}
              :disable={!isEditing}
              filled
              :options="['Vivo', 'Claro', 'Tim', 'Oi', 'Outros']"
              placeholder="Buscar..."
              @update:model-value={(val) => handleInputChange('operadora_celular', val)}
            >
              <template v-slot:no-option>
                <div className="text-center q-pa-md">
                  <div>Nenhuma operadora encontrada</div>
                </div>
              </template>
            </QSelect>
          </QField>
        </div>
        <div className="col-md-8">
          <QField label="Telefone celular" stack-label>
            <QInput
              v-model={formData.telefone_celular}
              :disable={!isEditing}
              filled
              mask="(##) #####-####"
              @update:model-value={(val) => handleInputChange('telefone_celular', val)}
            >
              <template v-slot:append>
                <QBtn
                  flat
                  dense
                  color="primary"
                  label="Enviar mensagem"
                  @click={handleEnviarMensagem}
                />
              </template>
            </QInput>
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
            >
              <template v-slot:append>
                <QBtn
                  flat
                  dense
                  color="primary"
                  label="Chamar no Whatsapp"
                  @click={handleChamarWhatsapp}
                />
              </template>
            </QInput>
          </QField>
        </div>
      </div>

      {/* Email principal */}
      <div className="row q-gutter-md">
        <div className="col-md-6">
          <QField label="E-mail principal" stack-label>
            <QInput
              v-model={formData.email_principal}
              type="email"
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('email_principal', val)}
            >
              <template v-slot:prepend>
                <QIcon name="info" color="primary" />
              </template>
              <template v-slot:append>
                <QBtn
                  flat
                  dense
                  color="primary"
                  label="Enviar e-mail"
                  @click={handleEnviarEmail}
                />
              </template>
            </QInput>
          </QField>
        </div>
        <div className="col-md-6">
          <QField label="Contato" stack-label>
            <QInput
              v-model={formData.contato}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('contato', val)}
            />
          </QField>
        </div>
      </div>

      {/* Redes sociais */}
      <div className="row q-gutter-md">
        <div className="col-md-4">
          <QField label="Website" stack-label>
            <QInput
              v-model={formData.website}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('website', val)}
            />
          </QField>
        </div>
        <div className="col-md-4">
          <QField label="Skype" stack-label>
            <QInput
              v-model={formData.skype}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('skype', val)}
            />
          </QField>
        </div>
        <div className="col-md-4">
          <QField label="Facebook" stack-label>
            <QInput
              v-model={formData.facebook}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('facebook', val)}
            />
          </QField>
        </div>
      </div>

      {/* Central do assinante */}
      <QSeparator className="q-my-lg" />
      
      <div className="row items-center q-mb-md">
        <div className="col">
          <div className="text-h6">Central do assinante</div>
        </div>
      </div>

      <div className="row q-gutter-md">
        <div className="col-md-6">
          <QField label="Login" stack-label>
            <QInput
              v-model={formData.login}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('login', val)}
            >
              <template v-slot:prepend>
                <QIcon name="info" color="primary" />
              </template>
            </QInput>
          </QField>
        </div>
        <div className="col-md-6">
          <QField label="Senha" stack-label>
            <QInput
              v-model={formData.senha}
              type="password"
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('senha', val)}
            />
            <div className="text-negative text-caption q-mt-xs">
              Esta é uma das 10 principais senhas comuns
            </div>
          </QField>
        </div>
      </div>

      {/* Permissões de acesso */}
      <div className="row q-gutter-md">
        <div className="col-12">
          <QField label="Permitir acesso automático" stack-label>
            <div className="q-gutter-sm">
              <QRadio
                v-model={formData.permitir_acesso_automatico}
                val="sim"
                label="Sim"
                disable={!isEditing}
                onUpdate:modelValue={(val) => handleInputChange('permitir_acesso_automatico', val)}
              />
              <QRadio
                v-model={formData.permitir_acesso_automatico}
                val="nao"
                label="Não"
                disable={!isEditing}
                onUpdate:modelValue={(val) => handleInputChange('permitir_acesso_automatico', val)}
              />
              <QRadio
                v-model={formData.permitir_acesso_automatico}
                val="padrao"
                label="Padrão"
                disable={!isEditing}
                onUpdate:modelValue={(val) => handleInputChange('permitir_acesso_automatico', val)}
              />
            </div>
            <template v-slot:hint>
              <QIcon name="info" color="primary" />
            </template>
          </QField>
        </div>
      </div>
    </div>
  );
};

export default ClienteContato;
