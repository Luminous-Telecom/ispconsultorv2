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
      <div className="card-body p-3">
        <div className="mb-2">
          <h6 className="card-title mb-0">
            Contatos do Cliente
          </h6>
        </div>

        <div className="row g-2">
          <div className="col-md-6">
            <label className="form-label small">Telefone Residencial</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-telephone"></i>
              </span>
              <input
                type="text"
                className="form-control form-control-sm"
                value={cliente.telefone_residencial || ''}
                onChange={(e) => handleInputChange('telefone_residencial', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label small">Telefone Comercial</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-telephone"></i>
              </span>
              <input
                type="text"
                className="form-control form-control-sm"
                value={cliente.telefone_comercial || ''}
                onChange={(e) => handleInputChange('telefone_comercial', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label small">Ramal</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.ramal || ''}
              onChange={(e) => handleInputChange('ramal', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small">Operadora Celular</label>
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
            <label className="form-label small">Telefone Celular</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control form-control-sm"
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
            <label className="form-label small">WhatsApp</label>
            <div className="input-group">
              <input
                type="text"
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
            <label className="form-label small">Email Principal</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-envelope"></i>
              </span>
              <input
                type="email"
                className="form-control form-control-sm"
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
            <label className="form-label small">Contato</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.contato || ''}
              onChange={(e) => handleInputChange('contato', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small">Website</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.website || ''}
              onChange={(e) => handleInputChange('website', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small">Skype</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.skype || ''}
              onChange={(e) => handleInputChange('skype', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label small">Facebook</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={cliente.facebook || ''}
              onChange={(e) => handleInputChange('facebook', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div className="col-12">
            <h6 className="mb-3">Centro de Assinantes</h6>
          </div>

          <div className="col-md-6">
            <label className="form-label small">Login</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-envelope"></i>
              </span>
              <input
                type="text"
                className="form-control form-control-sm"
                value={cliente.login || ''}
                onChange={(e) => handleInputChange('login', e.target.value)}
                disabled={!isEditing}
              />
            </div>
          </div>

          <div className="col-md-6">
            <label className="form-label small">Senha</label>
            <input
              type="password"
              className="form-control form-control-sm"
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
