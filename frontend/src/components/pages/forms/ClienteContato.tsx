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
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="card-title mb-0">
            Contatos do Cliente
          </h5>
          <button
            className="btn btn-outline-primary"
            onClick={handleEdit}
          >
            <i className={`bi ${isEditing ? 'bi-check' : 'bi-pencil'} me-1`}></i>
            {isEditing ? 'Salvar' : 'Editar'}
          </button>
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Telefone Residencial</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-telephone"></i>
              </span>
              <input
                type="text"
                className="form-control"
                value={cliente.telefone_residencial || ''}
                onChange={(e) => handleInputChange('telefone_residencial', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Telefone Comercial</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-telephone"></i>
              </span>
              <input
                type="text"
                className="form-control"
                value={cliente.telefone_comercial || ''}
                onChange={(e) => handleInputChange('telefone_comercial', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Ramal</label>
            <input
              type="text"
              className="form-control"
              value={cliente.ramal || ''}
              onChange={(e) => handleInputChange('ramal', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Operadora Celular</label>
            <select
              className="form-select"
              value={cliente.operadora_celular || ''}
              onChange={(e) => handleInputChange('operadora_celular', e.target.value)}
              disabled={!isEditing}
            >
              <option value="">Selecione...</option>
              <option value="vivo">Vivo</option>
              <option value="claro">Claro</option>
              <option value="tim">TIM</option>
              <option value="oi">OI</option>
              <option value="nextel">Nextel</option>
            </select>
          </div>

          <div className="col-md-6">
            <label className="form-label">Telefone Celular</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                value={cliente.telefone_celular || ''}
                onChange={(e) => handleInputChange('telefone_celular', e.target.value)}
                disabled={!isEditing}
              />
              <button className="btn btn-outline-secondary" type="button">
                <i className="bi bi-send"></i>
              </button>
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">WhatsApp</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
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
            <label className="form-label">Email Principal</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-envelope"></i>
              </span>
              <input
                type="email"
                className="form-control"
                value={cliente.email_principal || ''}
                onChange={(e) => handleInputChange('email_principal', e.target.value)}
                disabled={!isEditing}
              />
              <button className="btn btn-outline-secondary" type="button">
                <i className="bi bi-send"></i>
              </button>
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Contato</label>
            <input
              type="text"
              className="form-control"
              value={cliente.contato || ''}
              onChange={(e) => handleInputChange('contato', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Website</label>
            <input
              type="text"
              className="form-control"
              value={cliente.website || ''}
              onChange={(e) => handleInputChange('website', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Skype</label>
            <input
              type="text"
              className="form-control"
              value={cliente.skype || ''}
              onChange={(e) => handleInputChange('skype', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Facebook</label>
            <input
              type="text"
              className="form-control"
              value={cliente.facebook || ''}
              onChange={(e) => handleInputChange('facebook', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-12">
            <h6 className="mb-3">Centro de Assinantes</h6>
          </div>

          <div className="col-md-6">
            <label className="form-label">Login</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-envelope"></i>
              </span>
              <input
                type="text"
                className="form-control"
                value={cliente.login || ''}
                onChange={(e) => handleInputChange('login', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label">Senha</label>
            <input
              type="password"
              className="form-control"
              value={cliente.senha || ''}
              onChange={(e) => handleInputChange('senha', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-12">
            <fieldset>
              <legend className="form-label">Permitir Acesso Automático</legend>
              <div className="d-flex gap-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="permitir_acesso_automatico"
                    value="true"
                    checked={cliente.permitir_acesso_automatico === true}
                    onChange={(e) => handleInputChange('permitir_acesso_automatico', e.target.value === 'true')}
                    disabled={!isEditing}
                  />
                  <label className="form-check-label">
                    Sim
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="permitir_acesso_automatico"
                    value="false"
                    checked={cliente.permitir_acesso_automatico === false}
                    onChange={(e) => handleInputChange('permitir_acesso_automatico', e.target.value === 'true')}
                    disabled={!isEditing}
                  />
                  <label className="form-check-label">
                    Não
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

export default ClienteContato;
