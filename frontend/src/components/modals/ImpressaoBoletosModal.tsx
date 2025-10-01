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
        // Usar endpoint HTML
        iframe.src = getApiUrl(`/boleto/web/multiplos?ids=${idsParam}&_=${timestamp}`);
      }
    } catch (error) {
      console.error('Erro ao carregar boletos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImprimir = () => {
    const iframe = document.getElementById('iframe-boletos') as HTMLIFrameElement;
    if (iframe) {
      try {
        // Tentar imprimir diretamente
        iframe.contentWindow?.print();
      } catch (error) {
        // Se der erro de CORS, abrir em nova aba
        window.open(iframe.src, '_blank');
      }
    }
  };

  const handleBaixarPDF = () => {
    const iframe = document.getElementById('iframe-boletos') as HTMLIFrameElement;
    if (iframe) {
      try {
        // Tentar imprimir com opção de salvar como PDF
        iframe.contentWindow?.print();
      } catch (error) {
        // Se der erro de CORS, abrir em nova aba para o usuário salvar
        const newWindow = window.open(iframe.src, '_blank');
        if (newWindow) {
          // Após carregar, mostrar diálogo de impressão automaticamente
          newWindow.onload = () => {
            setTimeout(() => {
              newWindow.print();
            }, 500);
          };
        }
      }
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
      className="no-padding"
      headerActions={
        !loading && (
          <div className="d-flex justify-content-end mt-2">
            <button 
              className="btn btn-sm btn-success me-2"
              onClick={handleBaixarPDF}
            >
              Baixar PDF
            </button>
            <button 
              className="btn btn-sm btn-primary me-2"
              onClick={handleImprimir}
            >
              Imprimir
            </button>
            <button 
              className="btn btn-sm btn-secondary"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        )
      }
    >
      <div style={{ 
        height: `${modalHeight - 48}px`, // Altura total - header
        display: 'flex', 
        flexDirection: 'column',
        margin: 0,
        padding: 0,
        overflow: 'hidden'
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
              width: '100%',
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

