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
            <label className="form-label small text-muted">ID</label>
            <input
              type="text"
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
                checked={cliente.ativo}
                onChange={(e) => handleInputChange('ativo', e.target.checked)}
                disabled={!isEditing}
              />
              <label className="form-check-label">
                {cliente.ativo ? 'Ativo' : 'Inativo'}
              </label>
            </div>
          </div>


          <div className="col-md-6">
            <label className="form-label small text-muted">Razão Social</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.razao_social || ''}
              onChange={(e) => handleInputChange('razao_social', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small text-muted">Nome Fantasia</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.nome_fantasia || ''}
              onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small text-muted">
              {cliente.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.cnpj || ''}
              onChange={(e) => handleInputChange('cnpj', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small text-muted">
              {cliente.tipo_pessoa === 'juridica' ? 'Inscrição Estadual' : 'CPF'}
            </label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.inscricao_estadual || ''}
              onChange={(e) => handleInputChange('inscricao_estadual', e.target.value)}
              disabled={!isEditing}
            />
          </div>




          <div className="col-12">
            <label className="form-label small text-muted">Observações</label>
            <textarea
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
