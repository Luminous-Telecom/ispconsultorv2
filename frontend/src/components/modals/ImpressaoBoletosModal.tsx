import React, { useEffect, useState } from 'react';
import DraggableModal from '../common/DraggableModal';
import { getApiUrl } from '../../config/api';

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
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (show && ids.length > 0) {
      carregarBoletos();
    }
  }, [show, ids]);

  const carregarBoletos = async () => {
    setLoading(true);
    try {
      const iframe = document.getElementById('iframe-boletos') as HTMLIFrameElement;
      if (iframe) {
        const idsParam = ids.join(',');
        const timestamp = new Date().getTime();
        // Usar endpoint de PDF em vez de HTML
        iframe.src = getApiUrl(`/boleto/pdf/multiplos?ids=${idsParam}&_=${timestamp}`);
      }
    } catch (error) {
      console.error('Erro ao carregar boletos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular altura total do modal
  const modalHeight = typeof window !== 'undefined' ? window.innerHeight - 16 : 884;

  return (
    <DraggableModal
      show={show}
      onClose={onClose}
      title="Relatório"
      size="a4"
    >
      <div style={{ 
        height: `${modalHeight - 48}px`, // Altura total - header
        display: 'flex', 
        flexDirection: 'column',
        margin: 0,
        padding: 0
      }}>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ flex: 1 }}>
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        ) : (
          <iframe
            id="iframe-boletos"
            name="iframe-boletos"
            style={{ 
              width: '980px',
              height: `${modalHeight - 48}px`,
              margin: 0,
              border: 'none',
              display: 'block'
            }}
            title="Boletos"
          />
        )}
      </div>
    </DraggableModal>
  );
};

export default ImpressaoBoletosModal;

