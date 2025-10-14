import React, { useState } from 'react';

interface ClienteContatoProps {
  cliente: any;
  onDataChange: (field: string, value: any) => void;
}

const ClienteContato: React.FC<ClienteContatoProps> = ({ 
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
          Contatos do Cliente
        </small>
      </div>

      <div className="row g-1">




          <div className="col-md-6">
            <label htmlFor="cliente-telefone" className="form-label small text-muted">Telefone</label>
            <div className="input-group">
              <input
                type="text"
                id="cliente-telefone"
                name="telefone"
                autoComplete="tel"
                className="form-control form-control-sm"
                value={cliente.telefone || ''}
                onChange={(e) => handleInputChange('telefone', e.target.value)}
                disabled={!isEditing}
              />
              <button className="btn btn-outline-secondary" type="button">
                <i className="bi bi-send"></i>
              </button>
            </div>
          </div>

          <div className="col-md-6">
            <label htmlFor="cliente-whatsapp" className="form-label small text-muted">WhatsApp</label>
            <div className="input-group">
              <input
                type="text"
                id="cliente-whatsapp"
                name="whatsapp"
                autoComplete="tel"
                className="form-control form-control-sm"
                value={cliente.whatsapp || ''}
                onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                disabled={!isEditing}
              />
              <button className="btn btn-outline-success" type="button">
                <i className="bi bi-whatsapp"></i>
              </button>
            </div>
          </div>

          <div className="col-md-6">
            <label htmlFor="cliente-email" className="form-label small text-muted">Email</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-envelope"></i>
              </span>
              <input
                type="email"
                id="cliente-email"
                name="email"
                autoComplete="email"
                className="form-control form-control-sm"
                value={cliente.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="col-12">
            <h6 className="mb-3">Central do Assinante</h6>
          </div>

          <div className="col-md-6">
            <label htmlFor="cliente-login" className="form-label small text-muted">Login</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-envelope"></i>
              </span>
              <input
                type="text"
                id="cliente-login"
                name="login"
                className="form-control form-control-sm"
                value={cliente.login || ''}
                onChange={(e) => handleInputChange('login', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="col-md-6">
            <label htmlFor="cliente-senha" className="form-label small text-muted">Senha</label>
            <input
              type="password"
              id="cliente-senha"
              name="senha"
              autoComplete="new-password"
              className="form-control form-control-sm"
              value={cliente.senha || ''}
              onChange={(e) => handleInputChange('senha', e.target.value)}
              disabled={!isEditing}
            />
          </div>

        </div>
      </div>
  );
};

export default ClienteContato;
