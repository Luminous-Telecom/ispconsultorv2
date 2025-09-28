import React, { useState } from 'react';

interface ClienteDadosBasicosProps {
  cliente: any;
  onDataChange: (field: string, value: any) => void;
}

const ClienteDadosBasicos: React.FC<ClienteDadosBasicosProps> = ({ 
  cliente, 
  onDataChange 
}) => {
  const [isEditing, setIsEditing] = useState(true);

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (field: string, value: any) => {
    onDataChange(field, value);
  };

  if (!cliente) {
    return (
      <div>Carregando dados do cliente...</div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="mb-3">
          <h5 className="card-title mb-0">
            Dados Básicos do Cliente
          </h5>
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">ID</label>
            <input
              type="text"
              className="form-control"
              value={cliente.id || ''}
              disabled
            />
          </div>

          <div className="col-md-6">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                checked={cliente.ativo}
                onChange={(e) => handleInputChange('ativo', e.target.checked)}
                disabled={!isEditing}
              />
              <label className="form-check-label">
                {cliente.ativo ? 'Ativo' : 'Inativo'}
              </label>
            </div>
          </div>

          <div className="col-12">
            <fieldset>
              <legend className="form-label">Tipo de Pessoa</legend>
              <div className="d-flex gap-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="tipo_pessoa"
                    value="juridica"
                    checked={cliente.tipo_pessoa === 'juridica'}
                    onChange={(e) => handleInputChange('tipo_pessoa', e.target.value)}
                    disabled={!isEditing}
                  />
                  <label className="form-check-label">
                    Pessoa Jurídica
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="tipo_pessoa"
                    value="fisica"
                    checked={cliente.tipo_pessoa === 'fisica'}
                    onChange={(e) => handleInputChange('tipo_pessoa', e.target.value)}
                    disabled={!isEditing}
                  />
                  <label className="form-check-label">
                    Pessoa Física
                  </label>
                </div>
              </div>
            </fieldset>
          </div>

          <div className="col-md-6">
            <label className="form-label">Razão Social</label>
            <input
              type="text"
              className="form-control"
              value={cliente.razao_social || ''}
              onChange={(e) => handleInputChange('razao_social', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Nome Fantasia</label>
            <input
              type="text"
              className="form-control"
              value={cliente.nome_fantasia || ''}
              onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">
              {cliente.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}
            </label>
            <input
              type="text"
              className="form-control"
              value={cliente.cnpj || ''}
              onChange={(e) => handleInputChange('cnpj', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">
              {cliente.tipo_pessoa === 'juridica' ? 'Inscrição Estadual' : 'RG'}
            </label>
            <input
              type="text"
              className="form-control"
              value={cliente.inscricao_estadual || ''}
              onChange={(e) => handleInputChange('inscricao_estadual', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={cliente.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Telefone</label>
            <input
              type="text"
              className="form-control"
              value={cliente.telefone || ''}
              onChange={(e) => handleInputChange('telefone', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">WhatsApp</label>
            <input
              type="text"
              className="form-control"
              value={cliente.whatsapp || ''}
              onChange={(e) => handleInputChange('whatsapp', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-12">
            <label className="form-label">Observações</label>
            <textarea
              className="form-control"
              rows={3}
              value={cliente.observacoes || ''}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteDadosBasicos;
