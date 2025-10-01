import React, { useEffect, useState } from 'react';
import DraggableModal from '../common/DraggableModal';

interface ImpressaoBoletosModalProps {
  show: boolean;
  onClose: () => void;
  ids: number[];
}

const ImpressaoBoletosModal: React.FC<ImpressaoBoletosModalProps> = ({ 
  show, 
  onClose, 
  ids 
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (show && ids.length > 0) {
      carregarBoletos();
    }
  }, [show, ids]);

  const carregarBoletos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL?.replace('/api', '')}/boleto/web/multiplos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids })
      });

      const html = await response.text();
      setHtmlContent(html);
    } catch (error) {
      console.error('Erro ao carregar boletos:', error);
      setHtmlContent('<p>Erro ao carregar boletos</p>');
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = () => {
    const iframe = document.getElementById('iframe-boletos') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title={`Impressão de Boletos (${ids.length})`}
      size="fullscreen"
    >
      <div style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ flex: 1 }}>
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        ) : (
          <iframe
            id="iframe-boletos"
            srcDoc={htmlContent}
            style={{ 
              width: '100%', 
              flex: 1,
              border: 'none' 
            }}
            title="Boletos"
          />
        )}
        
        <div className="d-flex justify-content-end gap-2 mt-3 p-3 border-top">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
          >
            Fechar
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleImprimir} 
            disabled={loading}
          >
            Imprimir
          </button>
        </div>
      </div>
    </DraggableModal>
  );
};

export default ImpressaoBoletosModal;

