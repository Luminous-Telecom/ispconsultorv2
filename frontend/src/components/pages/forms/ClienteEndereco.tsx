import React, { useState, useEffect } from 'react';
import { QCard, QCardSection, QInput, QBtn, QIcon, QField, QSeparator, QRadio } from 'quasar';

interface ClienteEnderecoProps {
  cliente: any;
  isEditing: boolean;
  onEdit: () => void;
  onDataChange: () => void;
}

const ClienteEndereco: React.FC<ClienteEnderecoProps> = ({
  cliente,
  isEditing,
  onEdit,
  onDataChange
}) => {
  const [formData, setFormData] = useState({
    cep: cliente?.cep || '',
    endereco: cliente?.endereco || '',
    numero: cliente?.numero || '',
    complemento: cliente?.complemento || '',
    bairro: cliente?.bairro || '',
    cidade: cliente?.cidade || '',
    estado: cliente?.estado || '',
    condominio: '',
    bloco: '',
    apartamento: '',
    referencia: '',
    moradia: 'propria'
  });

  // Atualizar dados quando cliente mudar
  useEffect(() => {
    if (cliente) {
      setFormData({
        cep: cliente.cep || '',
        endereco: cliente.endereco || '',
        numero: cliente.numero || '',
        complemento: cliente.complemento || '',
        bairro: cliente.bairro || '',
        cidade: cliente.cidade || '',
        estado: cliente.estado || '',
        condominio: '',
        bloco: '',
        apartamento: '',
        referencia: '',
        moradia: 'propria'
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

  const handleValidarCep = () => {
    // Implementar validação de CEP
    console.log('Validando CEP:', formData.cep);
  };

  const handleMarcarCoordenadas = () => {
    // Implementar marcação de coordenadas
    console.log('Marcando coordenadas');
  };

  const handleVerificarDuplicidade = () => {
    // Implementar verificação de duplicidade
    console.log('Verificando duplicidade');
  };

  return (
    <div className="q-gutter-md">
      {/* Cabeçalho da seção */}
      <div className="row items-center">
        <div className="col">
          <div className="text-h6">Endereço Principal</div>
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

      {/* Dica sobre endereços */}
      <QCard flat bordered className="bg-grey-2">
        <QCardSection>
          <div className="row items-start">
            <QIcon name="info" color="primary" size="sm" className="q-mr-sm q-mt-xs" />
            <div className="col">
              <div className="text-caption text-weight-bold">DICA:</div>
              <div className="text-caption">
                A ordem de prioridade para impressão de títulos financeiros é:
                <br />1. Endereço de cobrança
                <br />2. Endereço do login
                <br />3. Endereço do contrato
                <br />4. Endereço principal (cliente)
              </div>
            </div>
          </div>
        </QCardSection>
      </QCard>

      {/* Campos de endereço */}
      <div className="row q-gutter-md">
        {/* Condomínio, Bloco, Apartamento */}
        <div className="col-md-4">
          <QField label="Condomínio" stack-label>
            <QInput
              v-model={formData.condominio}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('condominio', val)}
            >
              <template v-slot:append>
                <QIcon name="search" />
              </template>
            </QInput>
          </QField>
        </div>
        <div className="col-md-4">
          <QField label="Bloco" stack-label>
            <QInput
              v-model={formData.bloco}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('bloco', val)}
            />
          </QField>
        </div>
        <div className="col-md-4">
          <QField label="Apartamento" stack-label>
            <QInput
              v-model={formData.apartamento}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('apartamento', val)}
            />
          </QField>
        </div>
      </div>

      {/* CEP */}
      <div className="row q-gutter-md">
        <div className="col-md-4">
          <QField label="CEP *" stack-label>
            <QInput
              v-model={formData.cep}
              :disable={!isEditing}
              filled
              mask="#####-###"
              @update:model-value={(val) => handleInputChange('cep', val)}
            >
              <template v-slot:append>
                <QBtn
                  flat
                  dense
                  color="primary"
                  label="Validar"
                  @click={handleValidarCep}
                />
              </template>
            </QInput>
          </QField>
        </div>
        <div className="col-md-4">
          <QField label="CIF" stack-label>
            <QInput
              v-model={formData.referencia}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('referencia', val)}
            >
              <template v-slot:prepend>
                <QIcon name="info" color="primary" />
              </template>
            </QInput>
          </QField>
        </div>
      </div>

      {/* Endereço principal */}
      <div className="row q-gutter-md">
        <div className="col-md-8">
          <QField label="Endereço *" stack-label>
            <QInput
              v-model={formData.endereco}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('endereco', val)}
            >
              <template v-slot:prepend>
                <QIcon name="info" color="primary" />
              </template>
              <template v-slot:append>
                <div className="q-gutter-xs">
                  <QBtn
                    flat
                    dense
                    color="primary"
                    label="Marcar coordenadas"
                    @click={handleMarcarCoordenadas}
                  />
                  <QBtn
                    flat
                    dense
                    color="primary"
                    label="Verif. duplicidade"
                    @click={handleVerificarDuplicidade}
                  />
                </div>
              </template>
            </QInput>
          </QField>
        </div>
        <div className="col-md-4">
          <QField label="Número *" stack-label>
            <QInput
              v-model={formData.numero}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('numero', val)}
            />
          </QField>
        </div>
      </div>

      {/* Complemento */}
      <div className="row q-gutter-md">
        <div className="col-12">
          <QField label="Complemento" stack-label>
            <QInput
              v-model={formData.complemento}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('complemento', val)}
            />
          </QField>
        </div>
      </div>

      {/* Bairro, Cidade, Estado */}
      <div className="row q-gutter-md">
        <div className="col-md-4">
          <QField label="Bairro *" stack-label>
            <QInput
              v-model={formData.bairro}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('bairro', val)}
            />
          </QField>
        </div>
        <div className="col-md-6">
          <QField label="Cidade *" stack-label>
            <QInput
              v-model={formData.cidade}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('cidade', val)}
            >
              <template v-slot:append>
                <QIcon name="search" />
                <QIcon name="open_in_new" />
              </template>
            </QInput>
          </QField>
        </div>
        <div className="col-md-2">
          <QField label="Estado *" stack-label>
            <QInput
              v-model={formData.estado}
              :disable={!isEditing}
              filled
              maxlength="2"
              @update:model-value={(val) => handleInputChange('estado', val)}
            />
          </QField>
        </div>
      </div>

      {/* Referência */}
      <div className="row q-gutter-md">
        <div className="col-12">
          <QField label="Referência" stack-label>
            <QInput
              v-model={formData.referencia}
              :disable={!isEditing}
              filled
              @update:model-value={(val) => handleInputChange('referencia', val)}
            />
          </QField>
        </div>
      </div>

      {/* Opções de moradia */}
      <div className="row q-gutter-md">
        <div className="col-12">
          <QField label="Moradia" stack-label>
            <div className="q-gutter-sm">
              <QRadio
                v-model={formData.moradia}
                val="propria"
                label="Própria"
                :disable={!isEditing}
                @update:model-value={(val) => handleInputChange('moradia', val)}
              />
              <QRadio
                v-model={formData.moradia}
                val="alugada"
                label="Alugada"
                :disable={!isEditing}
                @update:model-value={(val) => handleInputChange('moradia', val)}
              />
            </div>
          </QField>
        </div>
      </div>
    </div>
  );
};

export default ClienteEndereco;
