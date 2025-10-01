import React, { useEffect, useState } from 'react';

interface ImpressaoBoletosModalProps {
  isOpen: boolean;
  onClose: () => void;
  ids: number[];
}

const ImpressaoBoletosModal: React.FC<ImpressaoBoletosModalProps> = ({ 
  isOpen, 
  onClose, 
  ids 
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && ids.length > 0) {
      carregarBoletos();
    }
  }, [isOpen, ids]);

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

  if (!isOpen) return null;

  return (
    <div 
      className="modal fade show" 
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      tabIndex={-1}
    >
      <div className="modal-dialog modal-fullscreen">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Impressão de Boletos ({ids.length})</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body" style={{ padding: 0, height: 'calc(100vh - 120px)' }}>
            {loading ? (
              <div className="d-flex justify-content-center align-items-center" style={{ height: '100%' }}>
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
                  height: '100%', 
                  border: 'none' 
                }}
                title="Boletos"
              />
            )}
          </div>
          <div className="modal-footer">
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
      </div>
    </div>
  );
};

export default ImpressaoBoletosModal;

