import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TituloService } from '../../services/tituloService';

const BoletoView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [boletoHtml, setBoletoHtml] = useState<string>('');

  useEffect(() => {
    const carregarBoleto = async () => {
      if (id) {
        try {
          const html = await TituloService.imprimirBoleto(parseInt(id));
          setBoletoHtml(html);
        } catch (error) {
          console.error('Erro ao carregar boleto:', error);
          setBoletoHtml('<p>Erro ao carregar boleto</p>');
        }
      }
    };

    carregarBoleto();
  }, [id]);

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2>Boleto - Parcela {id}</h2>
            <div>
              <button 
                className="btn btn-secondary"
                onClick={() => window.history.back()}
              >
                <i className="bi bi-arrow-left"></i> Voltar
              </button>
            </div>
          </div>
          <div 
            dangerouslySetInnerHTML={{ __html: boletoHtml }}
            style={{ backgroundColor: 'white', padding: '20px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default BoletoView;
