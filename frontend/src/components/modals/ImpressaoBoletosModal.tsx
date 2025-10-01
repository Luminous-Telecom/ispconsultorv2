import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';

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

  return (
    <Modal show={isOpen} onHide={onClose} size="xl" fullscreen>
      <Modal.Header closeButton>
        <Modal.Title>Impressão de Boletos ({ids.length})</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: 0, height: 'calc(100vh - 120px)' }}>
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
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
        <Button variant="primary" onClick={handleImprimir} disabled={loading}>
          Imprimir
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ImpressaoBoletosModal;

