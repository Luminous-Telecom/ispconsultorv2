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
    <div>
      <div className="mb-1">
        <small className="fw-bold">
          Dados Básicos do Cliente
        </small>
      </div>

      <div className="row g-1">
          <div className="col-md-6">
            <label htmlFor="cliente-id" className="form-label small text-muted">ID</label>
            <input
              type="text"
              id="cliente-id"
              name="id"
              className="form-control form-control-sm"
              value={cliente.id || ''}
              disabled
            />
          </div>

          <div className="col-md-6">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="cliente-ativo"
                name="ativo"
                checked={cliente.ativo}
                onChange={(e) => handleInputChange('ativo', e.target.checked)}
                disabled={!isEditing}
              />
              <label htmlFor="cliente-ativo" className="form-check-label">
                {cliente.ativo ? 'Ativo' : 'Inativo'}
              </label>
            </div>
          </div>


          <div className="col-md-6">
            <label htmlFor="cliente-razao-social" className="form-label small text-muted">Razão Social</label>
            <input
              type="text"
              id="cliente-razao-social"
              name="razao_social"
              className="form-control form-control-sm"
              value={cliente.razao_social || ''}
              onChange={(e) => handleInputChange('razao_social', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="cliente-nome-fantasia" className="form-label small text-muted">Nome Fantasia</label>
            <input
              type="text"
              id="cliente-nome-fantasia"
              name="nome_fantasia"
              className="form-control form-control-sm"
              value={cliente.nome_fantasia || ''}
              onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="cliente-cnpj" className="form-label small text-muted">
              CNPJ
            </label>
            <input
              type="text"
              id="cliente-cnpj"
              name="cnpj"
              className="form-control form-control-sm"
              value={cliente.cnpj || ''}
              onChange={(e) => handleInputChange('cnpj', e.target.value)}
              disabled={!isEditing}
            />
          </div>





          <div className="col-12">
            <label htmlFor="cliente-observacoes" className="form-label small text-muted">Observações</label>
            <textarea
              id="cliente-observacoes"
              name="observacoes"
              className="form-control form-control-sm"
              rows={3}
              value={cliente.observacoes || ''}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              disabled={!isEditing}
            />
          </div>
        </div>
      </div>
  );
};

export default ClienteDadosBasicos;
