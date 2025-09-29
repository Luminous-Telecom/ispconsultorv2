import React, { useState } from 'react';

interface ClienteEnderecoProps {
  cliente: any;
  onDataChange: (field: string, value: any) => void;
}

const ClienteEndereco: React.FC<ClienteEnderecoProps> = ({ 
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
    <div>
      <div className="mb-1">
        <small className="fw-bold">
          Endereço do Cliente
        </small>
      </div>

      <div className="row g-1">



          <div className="col-md-4">
            <label className="form-label small text-muted">CEP</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control form-control-sm"
                value={cliente.cep || ''}
                onChange={(e) => handleInputChange('cep', e.target.value)}
                disabled={!isEditing}
              />
              <button className="btn btn-outline-secondary" type="button">
                <i className="bi bi-search"></i>
              </button>
            </div>
          </div>


          <div className="col-md-8">
            <label className="form-label small text-muted">Endereço</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-geo-alt"></i>
              </span>
              <input
                type="text"
                className="form-control form-control-sm"
                value={cliente.endereco || ''}
                onChange={(e) => handleInputChange('endereco', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="col-md-4">
            <label className="form-label small text-muted">Número</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.numero || ''}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small text-muted">Complemento</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.complemento || ''}
              onChange={(e) => handleInputChange('complemento', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small text-muted">Bairro</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.bairro || ''}
              onChange={(e) => handleInputChange('bairro', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small text-muted">Cidade</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control form-control-sm"
                value={cliente.cidade || ''}
                onChange={(e) => handleInputChange('cidade', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label small text-muted">Estado</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.estado || ''}
              onChange={(e) => handleInputChange('estado', e.target.value)}
              disabled={!isEditing}
            />
          </div>

        </div>
      </div>
  );
};

export default ClienteEndereco;
