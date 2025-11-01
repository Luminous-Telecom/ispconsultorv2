import React from 'react';
import { Cliente } from '../../../types';
import { FormValue } from '../../../types/common';

interface ClienteEnderecoProps {
  cliente: Cliente;
  onDataChange: (field: string, value: FormValue) => void;
}

const ClienteEndereco: React.FC<ClienteEnderecoProps> = ({ 
  cliente, 
  onDataChange 
}) => {
  const handleInputChange = (field: string, value: FormValue) => {
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
            <label htmlFor="cliente-cep" className="form-label small text-muted">CEP</label>
            <div className="input-group">
              <input
                type="text"
                id="cliente-cep"
                name="cep"
                autoComplete="postal-code"
                className="form-control form-control-sm"
                value={cliente.cep || ''}
                onChange={(e) => handleInputChange('cep', e.target.value)}
              />
              <button className="btn btn-outline-secondary" type="button">
                <i className="bi bi-search"></i>
              </button>
            </div>
          </div>


          <div className="col-md-8">
            <label htmlFor="cliente-endereco" className="form-label small text-muted">Endereço</label>
            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-geo-alt"></i>
              </span>
              <input
                type="text"
                id="cliente-endereco"
                name="endereco"
                autoComplete="street-address"
                className="form-control form-control-sm"
                value={cliente.endereco || ''}
                onChange={(e) => handleInputChange('endereco', e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-4">
            <label htmlFor="cliente-numero" className="form-label small text-muted">Número</label>
            <input
              type="text"
              id="cliente-numero"
              name="numero"
              className="form-control form-control-sm"
              value={cliente.numero || ''}
              onChange={(e) => handleInputChange('numero', e.target.value)}
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="cliente-complemento" className="form-label small text-muted">Complemento</label>
            <input
              type="text"
              id="cliente-complemento"
              name="complemento"
              className="form-control form-control-sm"
              value={cliente.complemento || ''}
              onChange={(e) => handleInputChange('complemento', e.target.value)}
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="cliente-bairro" className="form-label small text-muted">Bairro</label>
            <input
              type="text"
              id="cliente-bairro"
              name="bairro"
              autoComplete="address-level3"
              className="form-control form-control-sm"
              value={cliente.bairro || ''}
              onChange={(e) => handleInputChange('bairro', e.target.value)}
            />
          </div>

          <div className="col-md-6">
            <label htmlFor="cliente-cidade" className="form-label small text-muted">Cidade</label>
            <div className="input-group">
              <input
                type="text"
                id="cliente-cidade"
                name="cidade"
                autoComplete="address-level2"
                className="form-control form-control-sm"
                value={cliente.cidade || ''}
                onChange={(e) => handleInputChange('cidade', e.target.value)}
              />
            </div>
          </div>

          <div className="col-md-6">
            <label htmlFor="cliente-estado" className="form-label small text-muted">Estado</label>
            <input
              type="text"
              id="cliente-estado"
              name="estado"
              autoComplete="address-level1"
              className="form-control form-control-sm"
              value={cliente.estado || ''}
              onChange={(e) => handleInputChange('estado', e.target.value)}
            />
          </div>

        </div>
      </div>
  );
};

export default ClienteEndereco;
