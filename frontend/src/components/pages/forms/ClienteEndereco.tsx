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
    <div className="card">
      <div className="card-body p-3">
        <div className="mb-2">
          <h6 className="card-title mb-0">
            Endereço do Cliente
          </h6>
        </div>

        <div className="row g-2">
          <div className="col-md-4">
            <label className="form-label small">Condomínio</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control form-control-sm"
                value={cliente.condominio || ''}
                onChange={(e) => handleInputChange('condominio', e.target.value)}
                disabled={!isEditing}
              />
              <button className="btn btn-outline-secondary" type="button">
                <i className="bi bi-geo-alt"></i>
              </button>
            </div>
          </div>

          <div className="col-md-4">
            <label className="form-label small">Bloco</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.bloco || ''}
              onChange={(e) => handleInputChange('bloco', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-4">
            <label className="form-label small">Apartamento</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.apartamento || ''}
              onChange={(e) => handleInputChange('apartamento', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-4">
            <label className="form-label small">CEP</label>
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
            <label className="form-label small">Referência</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-geo-alt"></i>
              </span>
              <input
                type="text"
                className="form-control form-control-sm"
                value={cliente.referencia || ''}
                onChange={(e) => handleInputChange('referencia', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="col-md-8">
            <label className="form-label small">Endereço</label>
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
              <button className="btn btn-outline-secondary" type="button">
                <i className="bi bi-geo-alt"></i>
              </button>
              <button className="btn btn-outline-success" type="button">
                <i className="bi bi-check"></i>
              </button>
            </div>
          </div>

          <div className="col-md-4">
            <label className="form-label small">Número</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.numero || ''}
              onChange={(e) => handleInputChange('numero', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small">Complemento</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.complemento || ''}
              onChange={(e) => handleInputChange('complemento', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small">Bairro</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.bairro || ''}
              onChange={(e) => handleInputChange('bairro', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small">Cidade</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control form-control-sm"
                value={cliente.cidade || ''}
                onChange={(e) => handleInputChange('cidade', e.target.value)}
                disabled={!isEditing}
              />
              <button className="btn btn-outline-success" type="button">
                <i className="bi bi-check"></i>
              </button>
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label small">Estado</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.estado || ''}
              onChange={(e) => handleInputChange('estado', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-12">
            <fieldset>
              <legend className="form-label">Tipo de Moradia</legend>
              <div className="d-flex gap-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="moradia"
                    value="propria"
                    checked={cliente.moradia === 'propria'}
                    onChange={(e) => handleInputChange('moradia', e.target.value)}
                    disabled={!isEditing}
                  />
                  <label className="form-check-label">
                    Própria
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="moradia"
                    value="alugada"
                    checked={cliente.moradia === 'alugada'}
                    onChange={(e) => handleInputChange('moradia', e.target.value)}
                    disabled={!isEditing}
                  />
                  <label className="form-check-label">
                    Alugada
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="moradia"
                    value="cedida"
                    checked={cliente.moradia === 'cedida'}
                    onChange={(e) => handleInputChange('moradia', e.target.value)}
                    disabled={!isEditing}
                  />
                  <label className="form-check-label">
                    Cedida
                  </label>
                </div>
              </div>
            </fieldset>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClienteEndereco;
